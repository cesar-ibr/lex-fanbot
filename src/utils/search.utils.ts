import mockCompletion from '../assets/mock-completion.json';
import { CLASSIFICATION_ENDPOINT } from '../utils/constants';

export interface CompletionResponse {
  choices?: {
    delta: {
      content: string;
    }
  }[];
  youtubeLinks?: string[];
}

export enum PromptClassifications {
  PODCAST_INFO = 'PODCAST_INFO',
  CONTENT_SEARCH = 'CONTENT_SEARCH',
  NON_PODCAST_RELATED = 'NON-PODCAST_RELATED',
}

export interface OnCompeltionFn {
  (data: CompletionResponse): void;
}

export interface FetchCompletionParams {
  url: string;
  query: string;
  onCompletion: OnCompeltionFn;
}

export const getPromptClassification = async (query = '') => {
  const res = await fetch(CLASSIFICATION_ENDPOINT, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  if (res.status !== 200) {
    throw new Error(`Error with request [CODE] ${res.status}`)
  }
  const { classification } = await res.json();
  return classification;
};

export const fetchChatCompletion = async ({ url, query, onCompletion }: FetchCompletionParams) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  if (response.status !== 200) {
    throw new Error(`Error with request [CODE] ${response.status}`)
  }
  // Check reader
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No streamable response');
  }
  // Handle each message until streaming is closed
  let done, value;
  while (!done) {
    ({ value, done } = await reader.read());
    const decodedChunk = new TextDecoder().decode(value);
    // Sometimes a chunk contains many data objects
    const dataChunks = decodedChunk.split('\n').filter((chunk) => !!chunk);
    dataChunks.forEach((chunk) => {
      const dataString = chunk.replace('data: ', '').replace('episodes: ', '').trim();
      if (dataString.includes('[DONE]')) {
        return;
      }
      const data = JSON.parse(dataString);
      onCompletion(data);
    });

    if (done) {
      break;
    }
  }
};

export const fakeStream = async (onCompletion: OnCompeltionFn) => {
  return new Promise((resolve) => {
    const tokens = mockCompletion.completion.split(' ');
    let i = 0;
    const interval = setInterval(() => {
      if (i === tokens.length) {
        clearInterval(interval);
        resolve('done');
      }
      onCompletion({
        choices: [{
          delta: {
            content: `${tokens[i]} `
          }
        }]
      });
      i++;
    }, 50);
  });
};

export const testQuestions = [
  {
    method: 'query',
    q: `What's the latest episode?`,
  },
  {
    method: 'query',
    q: `Episodes about democracy`,
  },
  {
    method: 'search',
    q: `What's Artificial Intelligence?`,
  },
  {
    method: 'search',
    q: `Why is the podcast so interesting?`,
  },
];
