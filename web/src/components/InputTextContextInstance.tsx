import { createContext } from 'react';

interface InputTextContextType {
    inputText: string;
    setInputText: (text: string) => void;
    selectedFile: File | null;
    setSelectedFile: (file: File | null) => void;
}

export const InputTextContext = createContext<InputTextContextType | undefined>(undefined);
