# 🤖 Auto-Mate

**A Personal Human-in-the-loop autonomous reAct Agent built for seamless daily task management.**

> [!IMPORTANT]
> **Status**: Auto-Mate is currently under active development and testing. Features and APIs are subject to change.

Auto-Mate is a specialized AI assistant designed to act autonomously on your behalf. By leveraging the power of Large Language Models and the reAct (Reasoning and Acting) paradigm, Auto-Mate can read and draft emails, schedule calendar events, and build a long-term memory of your context—all accessible via a convenient Telegram interface.

---

## 🚀 Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)
![OpenRouter](https://img.shields.io/badge/OpenRouter-656af0?style=for-the-badge&logo=openai&logoColor=white)
![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)

---

## 🧠 What are AI Agents and reAct?

**AI Agents** are intelligent systems that perceive their environment, make decisions, and take actions to achieve specific goals. Unlike traditional chatbots that only engage in turn-based conversations, AI Agents have access to external tools (like APIs, databases, or search engines) and can perform real-world tasks autonomously.

**reAct (Reasoning + Acting)** is a paradigm that allows AI models to interleave generating reasoning traces and task-specific actions. Instead of blindly executing tools, a reAct agent:

1. **Thinks** about the current state and what needs to be done.
2. **Acts** by calling a specific tool (e.g., fetching emails or querying the database).
3. **Observes** the result of the tool.
4. Repeats the cycle until the objective is fulfilled.

In Auto-Mate, the reAct loop powers the agent to intelligently decide whether it needs to search its long-term memory, read a specific email thread, or ask the user for confirmation before sending a message or booking a calendar slot.

---

## ✨ Complete Feature List

### 📧 Intelligent Gmail Management

- **Read & Summarize**: Fetches your unread emails and summarizes them so you don't have to read through long threads.
- **Deep Dive**: Reads specific email threads by ID for full context when requested.
- **Auto-Draft** _(Autonomous)_: Drafts a reply to an email based on the context and tone of the conversation.
- **Send Emails** _(Human-in-the-loop)_: Sends the drafted email directly from your account, but only after receiving authorization from you.
- **Inbox Zero**: Marks emails as read once you have processed them via the agent.

### 📅 Smart Calendar Scheduling

- **Check Availability**: Retrieves your upcoming schedule to answer questions like, "Am I free this Friday at 2 PM?"
- **Event Creation** _(Human-in-the-loop)_: Parses natural language (e.g., "Schedule a meeting with John tomorrow at 3 PM") and queues up a calendar event.
- **Conflict Avoidance**: Uses calendar data to ensure you don't double-book.

### 💾 Conversational Memory System

- **Episodic Memory**: Remembers past conversations and actions taken during a session.
- **Semantic Facts Memory**: Automatically detects and extracts important user facts (e.g., "I live in Berlin", "My manager is Sarah") and stores them.
- **Contextual Recall**: Actively queries its vector database (using pgvector) to retrieve past facts whenever you ask personal or contextual questions.

### 📱 Telegram Command Center

- **Natural Chat Interface**: No dashboards or complex UI. You just chat with the agent on Telegram as you would with a human assistant.
- **Push Notifications**: Sends you proactive alerts and confirmation requests safely to your mobile device.

---

## 🔄 How Autonomously It Works

Auto-Mate sits right between a standard chat assistant and a fully autonomous agent. It operates using a **"ReAct with Human-in-the-Loop"** framework to maximize convenience while guaranteeing safety:

1. **Triggering**: You send a natural language request via Telegram (e.g., "Check my emails and schedule a follow-up with anyone asking for a meeting.").
2. **Triage & Orchestration**: The system first classifies your intent. It decides whether to handle it as a simple greeting, a general question, a web search, or a complex task requiring tools.
3. **Contextual Memory Retrieval**: For task-oriented requests, the agent automatically searches its Memory module to retrieve your preferences, relationships, and context from its vector database.
4. **Reasoning & Tool Execution (Autonomous)**: If routed to the **ReAct Agent**, it _thinks_ about the goal and autonomously calls non-destructive tools (e.g., `fetchUnreadEmails`).
5. **Action Queuing**: The agent uses tools like `createDraft` or `createCalendarEvent` to prepare required actions.
6. **Approval Gate (Human-in-the-Loop)**: For **mutating actions** (sending an email, adding a calendar event), execution pauses. The agent pings you on Telegram summarizing what it is about to do.
7. **Final Execution**: Once you reply with an approval (`YES`), the agent executes the action and updates its memory.

This hybrid approach gives you the massive speed benefits of AI autonomy while entirely eliminating the risk of the agent hallucinating an accidental email or schedule change.

---

## 🏗️ System Architecture (The Layers)

Auto-Mate is built with a modular, multi-layered architecture to separate reasoning, memory, and execution:

1. **Triage & Orchestration Layer**: The entry point for all messages (`router.ts` & `triage.ts`). It acts as the "brain," classifying requests and routing them to specialized execution paths to minimize latency and maximize accuracy.
2. **Execution Layer (Agents)**: A suite of specialized agents:
   - **ReAct Agent** (`react-agent.ts`): The most powerful agent, handles multi-step tasks using tools.
   - **Chat Agent** (`chatAgent.ts`): Handles lightweight conversational interactions.
   - **Search Agent** (`searchAgent.ts`): Optimized for live web information retrieval.
3. **LLM Layer**: The intelligence engine powered by OpenRouter. We use advanced models like `gemini-2.0-flash` for reasoning and triage.
4. **Retrieval & Memory Layer**: Powered by PostgreSQL and `pgvector`, this layer manages episodic and semantic memory, providing the agents with long-term context.
5. **Tools Layer**: Functional executors (`lib/tools/`) for Gmail, Google Calendar, and more.

---

## 💾 The Tri-Partite Memory System

A true agent needs context. Auto-Mate uses a sophisticated, multi-layered memory system backed by **PostgreSQL** and **pgvector** to maintain continuity across sessions without exceeding LLM context parameters.

### 1. Short-Term Context (The Scratchpad)

During an active conversation, the agent maintains a temporary "scratchpad" (`AgentRun.actionsLog`). This holds the immediate conversational history, previous tool outputs from the current ReAct loop, and unconfirmed pending actions.

### 2. Episodic Memory (The Audit Trail)

Like human memory of discrete events, the `Episode` system logs specific, time-stamped actions. Every time an email is received, an event is created, or a task is finalized, an Episode is saved with a `1536`-dimension vector embedding.

- **Use Case**: This allows the agent to answer questions like: _"What did I discuss with John last week?"_ or _"Did I successfully send that calendar invite?"_

### 3. Semantic Memory (User Facts & Preferences)

Whereas Episodic memory stores events, Semantic Memory (`UserFact`) stores absolute truths and preferences. Auto-Mate continuously extracts and structures facts from your conversations into categories _(location, person, preference, routine, relationship)_.

- **Use Case**: Allows the agent to implicitly apply context over time (e.g., quietly remembering you prefer morning meetings, or associating the phrase "my manager" to a specific email address).

### 4. Narrative Memory (The Journal)

To prevent episodic memory pollution over long periods, the `JournalEntry` system creates automated daily summaries and weekly reviews. This compresses hundreds of individual episodes and emails into high-level, embedded themes.

- **Use Case**: Allows the agent to summarize sweeping long-term questions like _"What projects was I focused on last month?"_

---

## 🧠 Triage: Intelligent Routing

To ensure high performance and low token consumption, Auto-Mate employs a sophisticated triage system that orchestrates every request.

| Route      | Handler          | Purpose                                                                           |
| :--------- | :--------------- | :-------------------------------------------------------------------------------- |
| **Direct** | `router.ts`      | Immediate responses for greetings or general knowledge answers.                   |
| **Chat**   | `chatAgent.ts`   | Conversational brainstorming and open-ended dialogue without tools.               |
| **Search** | `searchAgent.ts` | Live web search for recent events and external information.                       |
| **Task**   | `react-agent.ts` | Complex, tool-heavy workflows (Gmail, Calendar, Memory) using the **ReAct** loop. |

---

## 📈 Performance & Efficiency

The shift to a triage-based architecture has significantly optimized the system's performance and cost-effectiveness. By routing simple queries to specialized, lightweight handlers, we avoid the overhead of the full ReAct loop when it's not required.

| Metric                | Improvement         |
| :-------------------- | :------------------ |
| **Token Consumption** | **30.6% Reduction** |
| **Success Rate**      | **100% Reliable**   |

> [!NOTE]
> **Cost Savings**: In our latest benchmarks (100 test cases), the Triage model reduced avg tokens from **1858** to **1289** per run, directly translating to a ~30% reduction in API costs without sacrificing task completion.

---

## ️ Technical Deep Dive: The ReAct Loop in Action

To understand how Auto-Mate truly works, let's trace a specific user request through the system:

**User Request**: _"Hey Auto-Mate, I have a meeting with John tomorrow at 2 PM. Can you check if I have any other meetings then and draft a confirmation email to him?"_

### 1. Initialization & Triage

- **Trigger**: The request hits the Telegram webhook and is passed to the `router.ts`.
- **Triage**: The Orchestrator classifies the request as a **Task** since it involves checking a calendar and drafting an email.
- **Memory Check**: For the Task route, the agent calls the `recallMemory` tool. It searches for "John" and "tomorrow".
- **Context Injected**: The system retrieves: _"John is your colleague; you usually have lunch on Wednesdays."_

### 2. The Reasoning Loop (ReAct)

The agent now enters the ReAct loop. It maintains a "scratchpad" of its thoughts.

**Step 1: Thought**

- \*"The user wants to check for conflicts and draft an email. I need to check the calendar first. I should use the `fetchUpcomingEvents` tool."
- **Action**: Calls `fetchUpcomingEvents` for the next 24 hours.

**Step 2: Observation**

- **Result**: The tool returns: _`[ { title: 'Team Standup', start: '2023-10-27T09:00:00', end: '2023-10-27T09:15:00' } ]`_

**Step 3: Thought**

- \*"Okay, I have a standup at 9 AM. The user wants a meeting at 2 PM. That's clear. Now I need to draft the email to John. I will use the `createDraft` tool."
- **Action**: Calls `createDraft` with the subject "Meeting Confirmation" and body based on the user's request.

### 3. The Approval Gate (Human-in-the-Loop)

- **Interception**: The `createDraft` tool is classified as a "mutating" action. The agent pauses execution.
- **Message**: It sends a message to the user's Telegram:
  > _"I've drafted an email to John confirming your meeting tomorrow at 2 PM. Should I send it? (Reply YES/NO)"_

### 4. Final Execution

- **User Reply**: You reply `YES`.
- **Final Action**: The agent calls the `sendDraft` tool with the draft ID.
- **Memory Update**: The agent logs this successful action to its memory, so it remembers sending this email if you ask about it later.

---

## 🙏 Acknowledgements

This project would not be possible without the incredible work of the open-source community. A huge thank you to:

- [**Next.js**](https://nextjs.org/) and [**React**](https://reactjs.org/) for the robust frontend and API routing framework.
- [**Prisma**](https://www.prisma.io/) and [**PostgreSQL**](https://www.postgresql.org/) for seamless and type-safe database interactions.
- [**OpenRouter**](https://openrouter.ai/) for unified access to state-of-the-art LLMs.
- [**Google Gemini**](https://deepmind.google/technologies/gemini/) for the powerful core reasoning and 2.0 Flash capabilities.
- [**Vercel AI SDK**](https://sdk.vercel.ai/) for simplifying AI tooling and text generation.
- [**Tailwind CSS**](https://tailwindcss.com/) for utility-first styling.
- [**Lucide**](https://lucide.dev/) for beautiful and accessible icons.
- [**Zod**](https://zod.dev/) for reliable schema validation.
- [**Clerk**](https://clerk.com/) for providing secure and easy-to-use authentication.


---

## Sources

- Build effective agents: https://www.anthropic.com/engineering/building-effective-agents
- context engineering: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- tools for AI agents: https://www.anthropic.com/engineering/writing-tools-for-agents
- multi agent system: https://www.anthropic.com/engineering/multi-agent-research-system

_Built with ❤️ to automate the mundane and focus on what matters._
