# AI Cues

I have been using free AI services like [meta.ai](https://www.meta.ai) and [mistral.ai](https://chat.mistral.ai) to quickly simulate user prompts for the agent I am building.

The problem is that these AIs are not trying to behave like people — they are trying to be a helpful virtual assistant. That means their responses are way too wordy and "helpful" for what I need to test with. Plus, shorter responses are much faster to generate.

I came up with a prompt that did what I wanted nicely:

> keep your responses short and to the point. act more like a normal human than a chatbot. I want responses to feel human, with human like mistakes in grammar and spelling, but keep the content spot on and correct

But I then realized that I was probably going to lose this prompt in the black hole of chat history.

## So, I built AI Cues

This is just a simple wallet to keep track of a prompt you might be fond of, and to open it directly inside your favorite AI tool (ChatGPT, Claude, Meta AI, and others).

## How it Works

```mermaid
flowchart LR
  A[Save a prompt] --> B[Pick an AI]
  B --> C[Launch]
  C --> D[Chat opens prefilled]
```

1. Sign in (or continue as a guest on this device).
2. Click **New prompt**, paste the cue you like, and save it.
3. Set your **Primary** AI in the toolbar — or use the row menu to pick a different one for a single launch.
4. Click a prompt in the list to open that AI with your text already filled in.
5. Edit or delete prompts anytime from the row actions.

That is it: store the prompt once, launch it into whichever chat you need, without digging through old threads.
