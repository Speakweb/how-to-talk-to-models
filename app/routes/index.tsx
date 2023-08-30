import React, {useRef, useEffect, useCallback, useState} from 'react';
import {Configuration, OpenAIApi, ChatCompletionRequestMessage} from 'openai';
import {type ActionArgs} from '@remix-run/node';
import {Form, useActionData, useNavigation, useSubmit} from '@remix-run/react';
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
  const message = body.get('message') as string;
  const chatHistory = JSON.parse(body.get('chat-history') as string) || [];

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

  const isSubmitting = navigation.state === 'submitting';

  const saveUserMessage = (message: string) => {
    setChatHistory(prevChatHistory => [...prevChatHistory, {role: 'user', content: message}]);
  };
  
  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.target as HTMLFormElement);
    const message = formData.get('message');

    saveUserMessage(message as string);
  };

  const submitFormOnEnter = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const value = (event.target as HTMLTextAreaElement).value;

    if (event.key === 'Enter' && !event.shiftKey && value.trim().length > 2) {
      saveUserMessage(value);
      submit(formRef.current, {replace: true});
    }
  }, [submit, formRef, saveUserMessage]);

  return (
    <main className="container mx-auto rounded-lg h-full grid grid-rows-layout p-4 pb-0 sm:p-8 sm:pb-0 max-w-full sm:max-w-auto">
      <div className="form-container p-4 sm:p-8 backdrop-blur-md sticky bottom-0">
        <Form
          aria-disabled={isSubmitting}
          method="post"
          ref={formRef}
          onSubmit={handleFormSubmit}
          replace
          className="max-w-[500px] mx-auto"
        >
          <div className="input-wrap relative flex items-center">
            <label htmlFor="message" className="absolute left[-9999px] w-px h-px overflow-hidden">Ask a question</label>
            <textarea
              id="message"
              aria-disabled={isSubmitting}
              ref={inputRef}
              className="auto-growing-input m-0 appearance-none text-black placeholder:text-black resize-none text-sm md:text-base py-3 pl-5 pr-14 border border-slate-400 outline-none rounded-4xl w-1/2 block leading-6 bg-white"
              placeholder="Ask a question"
              name="message"
              required
              rows={1}
              onKeyDown={submitFormOnEnter}
              minLength={2}
              disabled={isSubmitting}
            />
            <textarea
              id="message2"
              aria-disabled={isSubmitting}
              ref={inputRef}
              className="auto-growing-input m-0 appearance-none text-black placeholder:text-black resize-none text-sm md:text-base py-3 pl-5 pr-14 border border-slate-400 outline-none rounded-4xl w-1/2 block leading-6 bg-white"
              placeholder="Ask a question"
              name="message2"
              required
              rows={1}
              onKeyDown={submitFormOnEnter}
              minLength={2}
              disabled={isSubmitting}
            />
            <input
              type="hidden"
              value={JSON.stringify(chatHistory)} name="chat-history"
            />
            <button
              aria-label="Submit"
              aria-disabled={isSubmitting}
              className="absolute right-0 flex-shrink-0 items-center appearance-none text-black h-[50px] w-[50px] border-none cursor-pointer shadow-none rounded-4xl grid place-items-center group transition-colors disabled:cursor-not-allowed focus:outline-dark-blue"
              type="submit"
              disabled={isSubmitting}
            >
              <SendIcon />
            </button>
          </div>
        </Form>
      </div>
    </main>
  );
}
  return (
    <main className="container mx-auto rounded-lg h-full grid grid-rows-layout p-4 pb-0 sm:p-8 sm:pb-0 max-w-full sm:max-w-auto">
      <div className="chat-container">
        <div className="intro grid place-items-center h-full text-center">
          <div className="intro-content inline-block px-4 py-8 border border-error rounded-lg">
            <h1 className="text-3xl font-semibold">Oops, something went wrong!</h1>
            <p className="mt-4 text-error ">{error.message}</p>
            <p className="mt-4"><Link to="/">Back to chat</Link></p>
          </div>
        </div>
      </div>
    </main>
  );
}