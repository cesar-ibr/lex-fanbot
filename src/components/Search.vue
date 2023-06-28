<script setup lang="ts">
import { ref } from 'vue';
import TextSkeleton from './TextSkeleton.vue';
import { QUERY_ENDPOINT, SS_ENDPOINT } from '../utils/constants';
import {
  testQuestions,
  fetchChatCompletion,
  CompletionResponse,
  getPromptClassification,
  PromptClassifications,
} from '../utils/search.utils';

type CompletionBoxItem = {
  type: 'title' | 'completion' | 'episodes';
  content: string | string[];
};

const input = ref('');
const completionBoxContainer = ref<HTMLDivElement | null>(null);
const showLoading = ref(false);
const completionInProgress = ref(false);
const completionBoxItems = ref<CompletionBoxItem[]>([]);
const completionPlaceholder = ref('');
const youtubeLinks = ref<string[]>([]);
const errorMsg =
  'Apologies, there was a problem with your request. Please try again later.';

const validInput = (text = '') => {
  // TODO: validate characters
  return text.trim() !== '';
};

const scrollDown = () => {
  const container = completionBoxContainer.value;
  if (!container) {
    return;
  }
  if (container.scrollHeight > container.offsetHeight) {
    container.scroll({ behavior: 'instant', top: container.scrollHeight });
  }
};

const preCompletion = (query = '') => {
  input.value = '';
  completionInProgress.value = true;
  showLoading.value = true;
  youtubeLinks.value = [];
  completionBoxItems.value.push({ type: 'title', content: query });
  scrollDown();
};

const postCompletion = () => {
  completionInProgress.value = false;
  showLoading.value = false;
};

const appendItem = (item: CompletionBoxItem) => {
  completionBoxItems.value.push(item);
};

const onCompletion = (data: CompletionResponse) => {
  if (showLoading.value) {
    showLoading.value = false;
  }
  if (data.choices) {
    const { content = '' } = data.choices[0].delta;
    completionPlaceholder.value += content;
    scrollDown();
    return;
  }
  if (data.youtubeLinks) {
    youtubeLinks.value = data.youtubeLinks;
  }
};

const startCompletionStream = async (query = '', url = '') => {
  // Open stream
  try {
    await fetchChatCompletion({
      url,
      query,
      onCompletion, // Appends the stream in `completionPlaceholder`
    });
  } catch (error) {
    appendItem({ type: 'completion', content: errorMsg });
    postCompletion();
    return;
  }
  // Clean up placeholder
  appendItem({
    type: 'completion',
    content: completionPlaceholder.value,
  });
  completionPlaceholder.value = '';
  // Add Video links
  if (youtubeLinks.value.length) {
    appendItem({
      type: 'episodes',
      content: youtubeLinks.value,
    });
  }
};

const getChatCompletions = async () => {
  const query = `${input.value}`;
  let promptCategory = '';

  if (!validInput(query)) {
    return;
  }
  preCompletion(query); //Prepare placeholder and flags

  try {
    promptCategory = await getPromptClassification(query);
  } catch (error) {
    appendItem({ type: 'completion', content: errorMsg });
    postCompletion();
    return;
  }

  switch (promptCategory) {
    case PromptClassifications.PODCAST_INFO:
      await startCompletionStream(query, QUERY_ENDPOINT);
      break;
    case PromptClassifications.CONTENT_SEARCH:
      await startCompletionStream(query, SS_ENDPOINT);
      break;
    case PromptClassifications.NON_PODCAST_RELATED:
    default:
      appendItem({
        type: 'completion',
        content: `Sorry, I can't help with that 😬`,
      });
  }
  postCompletion();
  scrollDown();
};

const quickQuestion = async (question = '', method = '') => {
  preCompletion(question);
  if (method === 'search') {
    await startCompletionStream(question, SS_ENDPOINT);
  } else {
    await startCompletionStream(question, QUERY_ENDPOINT);
  }
  postCompletion();
  scrollDown();
};
</script>

<template>
  <div class="pt-4 px-12 pb-20 max-w-screen-md m-auto h-screen relative">
    <div
      ref="completionBoxContainer"
      class="completion-container overflow-y-scroll text-white">
      <!-- About -->
      <div class="about">
        <img
          src="/fanbot.png"
          alt="Lex Fanbot"
          class="w-40 md:w-48 lg:w-56 m-auto rounded-3xl" />
        <p class="text-center text-green-600 pt-2 text-2xl">
          Lex Fridman Fanbot
        </p>
        <p class="font-bold">Try</p>
        <template v-for="item in testQuestions">
          <span
            class="text-sm p-2 cursor-pointer inline-block underline underline-offset-4"
            @click="quickQuestion(item.q, item.method)"
            >{{ item.q }}</span
          >
        </template>
        <p class="text-xs py-2">
          Review the
          <a
            target="_blank"
            href="/about.html#limitations"
            class="underline text-blue-400"
            >limitations section</a
          >
          in case you don't get the answer you expect from the fanbot.
        </p>
      </div>
      <!-- Completion Box -->
      <div class="completion-box">
        <template v-for="item in completionBoxItems">
          <h3
            v-if="item.type === 'title'"
            class="text-blue-400 text-lg mt-4 capitalize">
            {{ item.content }}
          </h3>
          <p v-if="item.type === 'completion'" class="text-white">
            {{ item.content }}
          </p>
          <div v-if="item.type === 'episodes'">
            <p class="mt-4 text-sm text-green-600 capitalize">
              YouTube Episodes
            </p>
            <template v-for="link in item.content">
              <a
                :href="link"
                target="_blank"
                class="text-yellow-500 text-sm underline underline-offset-4 block pl-4"
                >{{ link }}</a
              >
            </template>
          </div>
        </template>
        <p class="text-white">{{ completionPlaceholder }}</p>
        <TextSkeleton v-show="showLoading" />
      </div>
    </div>
    <!-- SEARCH BOX -->
    <div
      class="search-bar p-2 rounded-md flex items-center bg-green-700 bottom-[30vh]"
      :class="{ bottom: completionBoxItems.length }">
      <input
        class="px-2 w-full bg-transparent outline-none text-white text-lg"
        type="text"
        v-model="input"
        :disabled="completionInProgress"
        @keyup.enter="getChatCompletions"
        autofocus
        :max="250"
        placeholder="Ask Lex Fanbot something..." />
      <button
        class="text-gray-300 transition ease-in-out duration-150 hover:-translate-y-1 hover:text-white hover:-rotate-45"
        @click="getChatCompletions"
        :disabled="completionInProgress">
        <svg
          width="24px"
          height="24px"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <path
            d="M18.0693 8.50867L9.50929 4.22867C3.75929 1.34867 1.39929 3.70867 4.27929 9.45867L5.14929 11.1987C5.39929 11.7087 5.39929 12.2987 5.14929 12.8087L4.27929 14.5387C1.39929 20.2887 3.74929 22.6487 9.50929 19.7687L18.0693 15.4887C21.9093 13.5687 21.9093 10.4287 18.0693 8.50867ZM14.8393 12.7487H9.43929C9.02929 12.7487 8.68929 12.4087 8.68929 11.9987C8.68929 11.5887 9.02929 11.2487 9.43929 11.2487H14.8393C15.2493 11.2487 15.5893 11.5887 15.5893 11.9987C15.5893 12.4087 15.2493 12.7487 14.8393 12.7487Z"
            fill="currentColor" />
        </svg>
      </button>
    </div>
  </div>
</template>
<style scoped>
.completion-container {
  max-height: 88vh;
}
.search-bar {
  position: absolute;
  -webkit-transition: all 0.3s linear 0s;
  transition: all 0.3s linear 0s;
  /* bottom: 30vh; */
  left: 3rem;
  right: 3rem;
}
.bottom {
  bottom: 2vh;
}
</style>
