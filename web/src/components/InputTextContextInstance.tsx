import { createContext } from 'react';

interface InputTextContextType {
    inputText: string;
    setInputText: (text: string) => void;
}

export const InputTextContext = createContext<InputTextContextType | undefined>(undefined);
