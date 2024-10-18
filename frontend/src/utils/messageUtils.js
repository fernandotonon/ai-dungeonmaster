const extractJsonContent = (message, key, defaultValue) => {
    if( message.startsWith('```json')){
        const jsonContent = message.split('```json')[1].split('```')[0];
        return JSON.parse(jsonContent)[key] || defaultValue;
    } else {
        try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage && typeof parsedMessage === 'object' && parsedMessage.hasOwnProperty(key)) {
            return parsedMessage[key];
        }
        } catch (error) {
        }
    }
    return defaultValue;
}

export const getMessageContent = (message) => {
    return extractJsonContent(message, 'content', message);
}

export const getMessageOptions = (message) => {
    return extractJsonContent(message, 'options', []);
}

const messageUtils = {
    getMessageContent,
    getMessageOptions
}

export default messageUtils;