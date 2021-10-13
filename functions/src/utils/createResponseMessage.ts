interface ResponseMessage {
    code: string,
    message: string,
    payload?: any
}

export const createResponseMessage = ({code, message, payload}: ResponseMessage) => {
    return {code, message, ...payload};
}