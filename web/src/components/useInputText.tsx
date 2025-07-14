import { useContext } from 'react';
import { InputTextContext } from './InputTextContextInstance';

export const useInputText = () => {
    const context = useContext(InputTextContext);
    if (!context) {
        throw new Error('useInputText must be used within an InputTextProvider');
    }
    return context;
}; 