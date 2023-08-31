import React, {useRef, useCallback, useState, useEffect} from 'react';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import {type ActionArgs} from '@remix-run/node';
import {Form, Link, useActionData, useNavigation, useSubmit} from '@remix-run/react';
import context from '~/context';
import {Send as SendIcon} from '../components/Icons';

export interface ReturnedDataProps {
  message?: string;
  answer: string;
  error?: string;
  chatHistory: ChatCompletionRequestMessage[];
}

export interface ChatHistoryProps extends ChatCompletionRequestMessage {
  error?: boolean,
}

export async function action({request}: ActionArgs): Promise<ReturnedDataProps> {
  const body = await request.formData();
  let message = body.get('message') as string;
  const exampleCode = `console.log("Hello World!")`
  const chatHistory = JSON.parse(body.get('chat-history') as string) || [];
  message = `Modify the following code:\n` + exampleCode + `\nTo these specifications: \n` + message + `\n Respond using ONLY executable code, with nothing else in your reply.`;
  const conf = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const openai = new OpenAIApi(conf);

    const chat = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        ...context,
        ...chatHistory,
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const answer = chat.data.choices[0].message?.content;

    return {
      message: body.get('message') as string,
      answer: answer as string,
      chatHistory,
    };
  } catch (error: any) {
    return {
      message: body.get('message') as string,
      answer: '',
      error: error.message || 'Something went wrong! Please try again.',
      chatHistory,
    };
  }
}

export default function IndexPage() {
  const data = useActionData<typeof action>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const submit = useSubmit();
  const [chatHistory, setChatHistory] = useState<ChatHistoryProps[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [randomCodeString, setRandomCodeAndChallengeString] = useState<string>('');
  const [gptResponse, setGptResponse] = useState<string>(''); // Added state for GPT response

  const isSubmitting = navigation.state === 'submitting';

  const saveUserMessage = (message: string) => {
    setChatHistory(prevChatHistory => [...prevChatHistory, {role: 'user', content: message}]);
  };

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => { // Made the function async
    const formData = new FormData(event.target as HTMLFormElement);
    const message = formData.get('message');

    saveUserMessage(message as string);
    
    submit(formData);
    // Call the action function with the message
  };

  useEffect(() => {
    if (data) {
      setGptResponse(data.answer);
      // alert("Congratulations!\n You Won!");
    }
  }, [data]);

  const submitFormOnEnter = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const value = (event.target as HTMLTextAreaElement).value;

    if (event.key === 'Enter' && !event.shiftKey && value.trim().length > 2) {
      saveUserMessage(value);
      submit(formRef.current, {replace: true});
      inputRef.current!.value = ''; // Clear the text inside the text box
    }
  }, [submit, formRef, saveUserMessage]);

  useEffect(() => {
    const startingCodeArray = [
      `console.log("Hello, World!");` // JavaScript code
    ];
    const startingChallengeArray = [
      `Modify the following code to print out "Hi!" five times. --> \n`
    ]
    // const randomIndex1 = Math.floor(Math.random() * startingChallengeArray.length);
    // const randomIndex2 = Math.floor(Math.random() * startingCodeArray.length);

    setRandomCodeAndChallengeString(startingChallengeArray[0] + startingCodeArray[0]);
  }, []);

  if (error) {
    return (
      <main className="container mx-auto rounded-lg h-full grid grid-rows-layout p-4 pb-0 sm:p-8 sm:pb-0 max-w-full sm:max-w-auto">
        <div className="chat-container">
          <div className="intro grid place-items-center h-full text-center">
            <div className="intro-content inline-block px-4 py-8 border border-error rounded-lg">
              <h1 className="text-3xl font-semibold">Oops, something went wrong!</h1>
              <p className="mt-4 text-error ">{error}</p>
              <p className="mt-4"><Link to="/">Back to chat</Link></p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto rounded-lg h-full grid grid-cols-3 gap-4 p-4 pb-0 sm:p-8 sm:pb-0 max-w-full sm:max-w-auto w-full">
      <div className="box-container p-4 sm:p-8 backdrop-blur-md border border-black">
        <h2 className="header font-bold text-lg">Code Display</h2> {/* Made the header text bold and slightly bigger */}
        <div className="content-box" style={{ wordWrap: 'break-word', overflow: 'auto'}}> {/* Added wordWrap and overflow styles to prevent horizontal overflow */}
          <div>{randomCodeString}</div>
        </div>
      </div>
      <div className="box-container p-4 sm:p-8 backdrop-blur-md border border-black flex flex-col">
        <h2 className="header font-bold text-lg">User Input</h2> {/* Made the header text bold and slightly bigger */}
        <div className="content-box flex-grow" style={{ wordWrap: 'break-word', overflow: 'auto' }}> {/* Added wordWrap and overflow styles to prevent horizontal overflow */}
          <div>{chatHistory.map(chat => `${chat.role}: ${chat.content}\n`)}</div>
        </div>
        <Form
          aria-disabled={isSubmitting}
          method="post"
          ref={formRef}
          onSubmit={handleFormSubmit}
          replace
          className="w-full flex flex-col justify-between" // Added flex and justify-between to position the button at the bottom
        >
          <div className="flex justify-between items-end"> {/* Added a div to wrap the textarea and button */}
            <textarea
              id="message"
              aria-disabled={isSubmitting}
              ref={inputRef}
              className="input-box flex-grow mr-2" // Added flex-grow to make the textarea take up the remaining space and margin-right for spacing
              placeholder="Type your message to ChatGPT here..."
              name="message"
              required
              rows={1}
              onKeyDown={submitFormOnEnter}
              minLength={2}
              disabled={isSubmitting}
              style={{ overflow: 'auto', resize: 'none', wordWrap: 'break-word' }} // Added wordWrap and overflow styles to prevent horizontal overflow and prevents user from manually resizing the textarea
              onInput={e => { // Dynamically adjust the height of the textarea
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              aria-label="Submit"
              aria-disabled={isSubmitting}
              className="submit-button"
              type="submit"
              disabled={isSubmitting}
            >
              <SendIcon />
            </button>
          </div>
          <input
            type="hidden"
            value={JSON.stringify(chatHistory)} name="chat-history"
          />
        </Form>
      </div>
      <div className="box-container p-4 sm:p-8 backdrop-blur-md border border-black">
        <h2 className="header font-bold text-lg">GPT Response</h2> {/* Made the header text bold and slightly bigger */}
        <div className="content-box" style={{ wordWrap: 'break-word', overflow: 'auto' }}> {/* Added wordWrap and overflow styles to prevent horizontal overflow */}
          <div>{gptResponse}</div> {/* Display the GPT response */}
        </div>
      </div>
    </main>
  )
};

