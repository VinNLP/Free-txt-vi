FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    default-jdk \
    default-jre \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN JAVA_BIN=$(readlink -f $(which java)) && \
    JAVA_HOME=$(dirname $(dirname $JAVA_BIN)) && \
    LIBJVM=$(find $JAVA_HOME -name libjvm.so | head -n 1) && \
    echo "export JAVA_HOME=$JAVA_HOME" >> /etc/profile.d/java.sh && \
    echo "export JVM_PATH=$LIBJVM" >> /etc/profile.d/java.sh && \
    echo "export PATH=$JAVA_HOME/bin:\$PATH" >> /etc/profile.d/java.sh && \
    echo "export LD_LIBRARY_PATH=$(dirname $LIBJVM):\$LD_LIBRARY_PATH" >> /etc/profile.d/java.sh && \
    chmod +x /etc/profile.d/java.sh && \
    echo "Discovered JAVA_HOME=$JAVA_HOME and libjvm.so=$LIBJVM"

ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV JVM_PATH=$JAVA_HOME/lib/server/libjvm.so
ENV PATH="$JAVA_HOME/bin:$PATH"
ENV LD_LIBRARY_PATH=$JAVA_HOME/lib/server:$LD_LIBRARY_PATH

COPY api/requirements requirements
RUN pip install --upgrade pip
RUN pip install -r requirements

RUN mkdir -p /models
RUN python -c "import nltk; \
    nltk.download('punkt_tab')"

RUN python -c "import os; \
    from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
    tokenizer = AutoTokenizer.from_pretrained('tabularisai/multilingual-sentiment-analysis'); \
    model = AutoModelForSequenceClassification.from_pretrained('tabularisai/multilingual-sentiment-analysis'); \
    model.save_pretrained('/models/multilingual-sentiment-analysis'); \
    tokenizer.save_pretrained('/models/multilingual-sentiment-analysis')"
        
RUN python -c "import os; \
    from transformers import AutoModelForCausalLM, AutoTokenizer; \
    print('Downloading Qwen2.5-0.5B-Instruct model...'); \
    model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct'); \
    tokenizer = AutoTokenizer.from_pretrained('Qwen/Qwen2.5-0.5B-Instruct'); \
    model.save_pretrained('/models/qwen2.5-0.5b-instruct'); \
    tokenizer.save_pretrained('/models/qwen2.5-0.5b-instruct')"

ENV MODEL_SUM_PATH=/models/qwen2.5-0.5b-instruct
ENV MODEL_SENTIMENT_PATH=/models/multilingual-sentiment-analysis
