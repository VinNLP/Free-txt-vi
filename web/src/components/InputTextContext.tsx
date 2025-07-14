import React, { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { InputTextContext } from './InputTextContextInstance';

export const InputTextProvider = ({ children }: { children: ReactNode }) => {
    const [inputText, setInputText] = useState<string>(() => {
        // Optional: load from localStorage
        return localStorage.getItem('inputText') || '';
    });

    useEffect(() => {
        // Optional: save to localStorage
        localStorage.setItem('inputText', inputText);
    }, [inputText]);

    return (
        <InputTextContext.Provider value={{ inputText, setInputText }}>
            {children}
        </InputTextContext.Provider>
    );
}; 