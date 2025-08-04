import os
import py_vncorenlp
import re
import gc

paths = [
    "/api/internal/services/pyvncorenlp",
    "/home/ubuntu/hung.nh2/vinnlp/Free-txt-vi/api/internal/services/pyvncorenlp",
    "services/pyvncorenlp"
]

for path in paths:
    print(f"Checking path: {path}")
    if os.path.exists(path):
        print(f"Path found: {path}")
        vncorenlp_model = py_vncorenlp.VnCoreNLP(save_dir=path)
        break


async def split_text_for_vncorenlp(text: str, max_words: int = 200) -> list[str]:
    """
    Split text into chunks that can be processed by VnCoreNLP.
    Each chunk will contain approximately max_words words.
    Reduced from 500 to 200 to avoid Java heap space issues.

    Args:
        text: Input text to split
        max_words: Maximum number of words per chunk (default 200 for VnCoreNLP)

    Returns:
        List of text chunks
    """
    # Split text into sentences to avoid breaking in the middle of sentences
    sentences = re.split(r'[.!?]+', text)

    chunks = []
    current_chunk = []
    current_word_count = 0

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue

        # Count words in this sentence
        sentence_words = len(sentence.split())

        # If a single sentence is too long, split it further
        if sentence_words > max_words:
            # Split long sentences by commas or other punctuation
            sub_sentences = re.split(r'[,;:]', sentence)
            for sub_sentence in sub_sentences:
                sub_sentence = sub_sentence.strip()
                if not sub_sentence:
                    continue

                sub_words = len(sub_sentence.split())
                if sub_words > max_words:
                    # If still too long, split by spaces
                    words = sub_sentence.split()
                    for i in range(0, len(words), max_words):
                        chunk_words = words[i:i + max_words]
                        chunks.append(' '.join(chunk_words))
                else:
                    # Add to current chunk or start new one
                    if current_word_count + sub_words > max_words and current_chunk:
                        chunks.append(' '.join(current_chunk))
                        current_chunk = [sub_sentence]
                        current_word_count = sub_words
                    else:
                        current_chunk.append(sub_sentence)
                        current_word_count += sub_words
        else:
            # If adding this sentence would exceed the limit, start a new chunk
            if current_word_count + sentence_words > max_words and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [sentence]
                current_word_count = sentence_words
            else:
                current_chunk.append(sentence)
                current_word_count += sentence_words

    # Add the last chunk if it has content
    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks


async def process_text_with_vncorenlp(text: str, max_words: int = 200) -> list[str]:
    """
    Process text with VnCoreNLP, handling large texts by splitting into chunks.
    Reduced default chunk size to 200 words to avoid Java heap space issues.

    Args:
        text: Input text to process
        max_words: Maximum words per chunk for VnCoreNLP processing (default 200)

    Returns:
        List of segmented text chunks
    """
    # Split text into manageable chunks
    text_chunks = await split_text_for_vncorenlp(text, max_words)

    # Process each chunk with VnCoreNLP
    segmented_chunks = []
    for i, chunk in enumerate(text_chunks):
        if chunk.strip():
            try:
                segmented_chunk = vncorenlp_model.word_segment(chunk.lower())
                segmented_chunks.extend(segmented_chunk)

                # Force garbage collection every few chunks to free memory
                if i % 5 == 0:
                    gc.collect()

            except Exception as e:
                # If a chunk fails, try processing it in smaller pieces
                print(f"Error processing chunk {i}: {e}")
                # Split the chunk further if it's still too large
                sub_chunks = chunk.split('.')
                for sub_chunk in sub_chunks:
                    if sub_chunk.strip():
                        try:
                            sub_segmented = vncorenlp_model.word_segment(sub_chunk.strip().lower())
                            segmented_chunks.extend(sub_segmented)
                        except Exception as sub_e:
                            print(f"Error processing sub-chunk: {sub_e}")
                            # If all else fails, just split by spaces
                            segmented_chunks.extend(sub_chunk.strip().lower().split())

    # Final garbage collection
    gc.collect()
    return segmented_chunks


async def process_text_with_vncorenlp_safe(text: str, max_words: int = 200) -> list[str]:
    """
    Process text with VnCoreNLP with additional safety measures for very large texts.
    This function will automatically reduce chunk size if memory issues occur.

    Args:
        text: Input text to process
        max_words: Maximum words per chunk for VnCoreNLP processing (default 200)

    Returns:
        List of segmented text chunks
    """
    # Check text size and warn if very large
    word_count = len(text.split())
    if word_count > 10000:
        print(f"Warning: Processing very large text with {word_count} words")

    # Try with the default chunk size first
    try:
        return await process_text_with_vncorenlp(text, max_words)
    except Exception as e:
        print(f"Error with default chunk size {max_words}: {e}")

        # If that fails, try with smaller chunks
        smaller_chunks = [50, 25, 10]
        for chunk_size in smaller_chunks:
            try:
                print(f"Retrying with chunk size {chunk_size}")
                return await process_text_with_vncorenlp(text, chunk_size)
            except Exception as retry_e:
                print(f"Error with chunk size {chunk_size}: {retry_e}")
                continue

        # If all else fails, just split by spaces as a fallback
        print("All VnCoreNLP processing failed, using fallback space-based splitting")
        return text.lower().split()
