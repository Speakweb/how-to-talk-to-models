import {readFile, writeFile} from 'fs/promises';
import openai from 'openai'; // Assuming these are the correct imports
const cacheFilename = 'responseCache.json';
let cache: Record<string, any> = {};
let cacheLoaded = false;
export async function getChatGPTResponse<T>(
    prompt: string,
    messages: openai.Chat.ChatCompletionMessage[],
    functions: openai.Chat.CompletionCreateParams.Function[],
    callbacks: ((params: any) => any)[]
): Promise<T> {
    if (!cacheLoaded) {
        try {
            cache = JSON.parse(await readFile(cacheFilename, 'utf-8'));
        } catch(e) {
            console.error(`Couldn't read cache`);
            cache = {};
        }
    }
    cacheLoaded = true;
    const cacheKey = `responseCache.${prompt + JSON.stringify(functions) + JSON.stringify(messages)}`;
    const cachedResponse = cache[cacheKey] as T;

    if (cachedResponse) {
        return cachedResponse;
    }

    let response = '';

    const sendUserMessage = async (input: string) => {
        const requestMessage: openai.Chat.ChatCompletionMessage = {
            role: 'user',
            content: input,
        };
        const GPTAPIKey = process.env.OPENAI_API_KEY;
        if (!GPTAPIKey){
            console.error("'OPENAI_API_KEY' not found within process.env.");
            return;
        }
        const conf = new openai({
            apiKey: GPTAPIKey,
        });

        try {
            const GPTModel = process.env.GPT_MODEL || "gpt-4-0613";
            const completion = await conf.chat.completions.create({
                model: GPTModel,
                messages: messages.concat(requestMessage),
                functions: functions.length ? functions : undefined,
                function_call: functions.length ? 'auto' : undefined
            });

            const responseMessage = completion.choices[0].message;
            let responseContent = responseMessage?.content;
            if (responseMessage?.function_call) {
                const function_name = responseMessage?.function_call?.name;
                const foundFunction = callbacks.find(callback => callback.name === function_name);
                if (!foundFunction) {
                    throw new Error(`what the fuck ChatGPT function ${function_name} not found`);
                }
                responseContent = foundFunction(
                    JSON.parse(responseMessage?.function_call?.arguments || "{}")
                );
                console.log(responseContent)
            }


            if (responseMessage && responseContent) {
                response = responseContent,
                    messages.push({
                        role: responseMessage.role,
                        function_call: responseMessage.function_call,
                        content: responseMessage.content
                    });
            }
        } catch (error) {
            throw error;
        }
    };

    await sendUserMessage(prompt);

    cache[cacheKey] = response;
    // Cache the response
    await writeFile(cacheFilename, JSON.stringify(cache));

    return response as unknown as T;
}

export const askLanguageModelShape = <T>(
    prompt: string,
    returnFunctionShape: openai.Chat.CompletionCreateParams.Function,
    returnFunction: (v: any) => T
): Promise<T> => {
    return getChatGPTResponse<T>(
        prompt,
        [],
        [returnFunctionShape],
        [returnFunction]
    );
}

/*
 * In regards to askLanguageModelShape()
 * This function is used to ask the language model a question and process its response.
 * It takes three parameters:
 * - prompt: This is the question that you want to ask the language model.
 * - returnFunctionShape: This is the shape of the function that will process the language model's response.
 * - returnFunction: This is the function that will process the language model's response.
 * 
 * The function returns a Promise that resolves to the processed response from the language model.
 * 
 * Here is an example of how to use this function:
 * 
 * const result = await askLanguageModelShape<{ correct: boolean, reason: string }>(
 *     `The following is a criteria for completion of a request: "${verificationPrompt}".
 *     Does the following response to the request fulfill the criteria?
 *     ${result}
 *     `,
 *     {
 *         "name": "evaluateCorrectness",
 *         "description": "Evaluate the correctness of an operation and provide a reason",
 *         "parameters": {
 *             "type": "object",
 *             "properties": {
 *                 "correct": {
 *                     "type": "boolean",
 *                     "description": "Indicates whether the operation is correct"
 *                 },
 *                 "reason": {
 *                     "type": "string",
 *                     "description": "Explains why the operation is correct or incorrect"
 *                 }
 *             },
 *             "required": ["correct", "reason"]
 *         }
 *     },
 *     evaluateCorrectness
 * );
 */