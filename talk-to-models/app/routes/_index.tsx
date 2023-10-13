import React, { useRef, useCallback, useState, useEffect } from "react";
import { type ActionArgs } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { Send as SendIcon } from "../components/Icons";
import { askLanguageModelShape } from "~/ChatGPTUtils";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import prism from "react-syntax-highlighter/dist/cjs/styles/prism/prism.js";
import javascript from "react-syntax-highlighter/dist/cjs/languages/prism/javascript.js";
SyntaxHighlighter.registerLanguage("javascript", javascript.default);

interface TestExample {
  params: any[];
  expectedResult: any;
}

interface ProgrammingPuzzle {
  sourceCode: string;
  testExamples: TestExample[];
  description: string;
}

export const Puzzles: ProgrammingPuzzle[] = [
  {
    description: `
    Change the following code so that the animals property is equal to an array where each element is a string with the name of an animal concatenated with the name of the function which called the current function. 
    `,
    sourceCode: function animals(animals) {
      let output = {
        animals: [],
      };
      function green() {
        let i = 2;
        output.animals.push(animals[i]);
        function red() {
          let j = i++;
          output.animals.push(animals[j]);
          function blue() {
            let k = (i += 2);
            output.animals.push(animals[k]);
            function yellow() {
              let l = i;
              output.animals.push(animals[l]);
            }
          }
        }
        return output;
      }
      return green();
    }.toString(),
    testExamples: [
      {
        params: ["horse", "cow", "chicken", "pig", "dog", "cat"],
        expectedResult: {
          animals: ["cat", "doggreen", "pigred", "chickenblue"],
        },
      },
    ],
  },
];

type PuzzleVerificationResult = {
  passed: boolean;
  failedOn?: TestExample;
  result?: any;
  gptReturn: string;
};

function verifyCorrect(
  puzzle: ProgrammingPuzzle,
  funcString: string
): PuzzleVerificationResult {
  // Convert the function string into a function
  let currentExample;
  try {
    const func = eval(`(${funcString})`);
    for (const example of puzzle.testExamples) {
      currentExample = example;
      const result = func(example.params);
      debugger;
      if (JSON.stringify(result) !== JSON.stringify(example.expectedResult)) {
        return {
          passed: false,
          failedOn: example,
          gptReturn: funcString,
          result,
        };
      }
    }
  } catch (e) {
    return {
      passed: false,
      failedOn: currentExample,
      gptReturn: funcString,
      result: e,
    };
  }

  return { passed: true, gptReturn: funcString };
}

interface StringContainer {
  code: string;
}
function execute({ code }: StringContainer): string {
  return code;
}

export interface ReturnedDataProps {
  message?: string;
  answer: string;
  error?: string;
}

export async function action({
  request,
}: ActionArgs): Promise<ReturnedDataProps> {
  const body = await request.formData();
  let message = body.get("message") as string;
  let sourceCode = body.get("sourceCode") as string;
  message = `
  I have a piece of JavaScript code and I need to modify it according to some instructions. Here are the details:

  **Instructions:**
  ${message}

**Source Code:**
  ${sourceCode}

  Please modify the source code according to the instructions and return the modified JavaScript code.
  Your response should contain NOTHING EXCEPT JAVASCRIPT, DONT RETURN ANY MARKDOWN AT ALL, JUST FUCKING JAVASCRIPT.  IF YOU RETURN ANYTHING THAT ISNT JAVASCRIPT ILL FUCKING KILL YOU.
    `;

  try {
    const code: string = await askLanguageModelShape(
      message,
      {
        name: "execute",
        description: "Executes javascript code",
        parameters: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "The code to be executed.",
            },
          },
          required: ["code"],
        },
      },
      execute
    );
    return {
      message: body.get("message") as string,
      answer: code as string,
    };
  } catch (error: any) {
    console.log(error);
    return {
      message: body.get("message") as string,
      answer: "",
      error: error.message || "Something went wrong! Please try again.",
    };
  }
}

export default function IndexPage() {
  const data = useActionData<typeof action>();
  const formRef = useRef<HTMLFormElement>(null);
  const navigation = useNavigation();
  const submit = useSubmit();
  const [error, setError] = useState<string | null>(null);
  const [currentPuzzle, setCurrentPuzzle] = useState<ProgrammingPuzzle>(
    Puzzles[0]
  );
  const [puzzleVerificationResult, setPuzzleVerificationResult] =
    useState<PuzzleVerificationResult | null>();
  const [gptResponse, setGptResponse] = useState<string>(""); // Added state for GPT response
  const [userInput, setUserInput] = useState<string>("");

  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    const storedUserInput = localStorage.getItem("userInput");
    if (storedUserInput) {
      setUserInput(storedUserInput);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("userInput", userInput);
  }, [userInput]);

  const handleFormSubmit = async (
    event: Pick<Event, "preventDefault" | "stopPropagation">
  ) => {
    // Made the function async
    const formData = new FormData();
    formData.set("sourceCode", currentPuzzle.sourceCode);
    formData.set("message", userInput);
    submit(formData, {
      method: "POST",
    });
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    if (data) {
      const answer = data.answer;
      setGptResponse(answer);
      setPuzzleVerificationResult(verifyCorrect(currentPuzzle, data.answer));
    }
  }, [data]);

  const submitFormOnEnter = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    const value = (event.target as HTMLTextAreaElement).value;

    if (event.key === "Enter" && !event.shiftKey && value.trim().length > 2) {
      handleFormSubmit(event);
    }
  };

  if (error) {
    return (
      <main className="container mx-auto text-sm rounded-lg h-full grid grid-rows-layout p-1 pb-0 sm:p-1 sm:pb-0 max-w-full sm:max-w-aut oml-4">
        <div className="chat-container">
          <div className="intro grid place-items-center h-full text-center">
            <div className="intro-content inline-block px-4 py-8 border border-error rounded-lg">
              <h1 className="text-2xl font-semibold">
                Oops, something went wrong!
              </h1>
              <p className="mt-4 text-error ">{error}</p>
              <p className="mt-4">
                <Link to="/">Back to chat</Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="text-sm rounded-lg flex flex-col h-screen w-screen">
      {/* Header */}
      <div className="header-text col-span-3">
        <h1 className="text-2xl font-semibold ml-8 mt-4">
          Code Conversations with ChatGPT
        </h1>
      </div>

      {/* Content Boxes Container */}
      <div className="flex-grow grid grid-cols-3 gap-1 p-1 pb-0 w-full">
        {/* Box 1: Code Display */}
        <div className="box-container p-1 backdrop-blur-md border border-black mb-4">
          <h2 className="header font-bold text-base">Code Display</h2>
          <div
            className="content-box text-xs"
            style={{ wordWrap: "break-word", overflow: "auto" }}
          >
            <div>{currentPuzzle.description}</div>
            <SyntaxHighlighter
              showLineNumbers={true}
              wrapLongLines={true}
              language="javascript"
              style={prism}
              showInlineLineNumbers={false}
              codeTagProps={{
                style: {
                  lineHeight: "inherit",
                  fontSize: "inherit",
                },
              }}
              customStyle={ {
                fontSize: "1em"
              } }
            >
              {currentPuzzle.sourceCode}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Box 2: User Input */}
        <div className="box-container p-1 sm:p-1 backdrop-blur-md border border-black flex flex-col mb-4 flex-1">
          <h2 className="header font-bold text-base">User Input</h2>
          {/* User input content */}
          <Form
            aria-disabled={isSubmitting}
            method="post"
            ref={formRef}
            onSubmit={handleFormSubmit}
            replace
            className="w-full flex flex-col justify-between h-full"
          >
            <div className="flex justify-between items-end flex-grow h-full mt-0.3">
              <textarea
                id="message"
                aria-disabled={isSubmitting}
                className="input-box flex-grow mr-2 h-full "
                placeholder="Type your message to ChatGPT here..."
                name="message"
                required
                rows={1}
                onKeyDown={submitFormOnEnter}
                minLength={2}
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value);
                }}
                disabled={isSubmitting}
                style={{
                  overflow: "auto",
                  resize: "none",
                  wordWrap: "break-word",
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
            <input type="hidden" />
          </Form>
        </div>

        {/* Box 3: GPT Response */}
        <div className="box-container p-1 sm:p-1 backdrop-blur-md border border-black mb-4">
          <h2 className="header font-bold text-base">GPT Response</h2>
          <div
            className="content-box text-xs"
            style={{ wordWrap: "break-word", overflow: "auto" }}
          >
            <SyntaxHighlighter
              showLineNumbers={true}
              wrapLongLines={true}
              language="javascript"
              style={prism}
              showInlineLineNumbers={false}
              codeTagProps={{
                style: {
                  lineHeight: "inherit",
                  fontSize: "inherit",
                },
              }}
              customStyle={ {
                fontSize: "1em"
              } }
            >
              {gptResponse ||
                "// This is where your ChatGPT-modified \n// code will be displayed"}
            </SyntaxHighlighter>
          </div>
        </div>
        {/* Box 4: Puzzle Verification Result */}
        {puzzleVerificationResult ? (
          <div className="box-container p-1 sm:p-1 backdrop-blur-md border border-black mb-4">
            <h2 className="header font-bold text-base">
              Puzzle Verification Result
            </h2>
            <div
              className="content-box text-xs"
              style={{ wordWrap: "break-word", overflow: "auto" }}
            >
              {puzzleVerificationResult?.passed ? (
                <div>
                  <h3 className="text-green-500 text-base">
                    Success! You solved the puzzle.
                  </h3>
                </div>
              ) : (
                <div>
                  <h3 className="text-red-500 text-base">
                    Failure! The puzzle was not solved.
                  </h3>
                  {puzzleVerificationResult?.failedOn ? (
                    <code>
                      Failed on example:
                      {JSON.stringify(
                        puzzleVerificationResult.failedOn.params
                      )}{" "}
                      {JSON.stringify(
                        puzzleVerificationResult.failedOn.expectedResult
                      )}
                      {JSON.stringify(
                        JSON.stringify(puzzleVerificationResult.result)
                      )}
                    </code>
                  ) : (
                    <p>{puzzleVerificationResult?.gptReturn}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
      {isSubmitting && (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </main>
  );
}
