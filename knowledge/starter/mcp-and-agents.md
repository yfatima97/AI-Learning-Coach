# MCP and AI agents

## What is an AI agent?
An agent is an LLM that works in a loop: it decides on an action, calls a tool, reads the result and decides what to do next until the goal is met. A plain chatbot answers once; an agent can plan, use tools and correct itself.

Good agent design:
- Give the model a small set of clear, well-described tools.
- Start with the simplest design that works: a single LLM call, then a fixed workflow, then a fully autonomous agent only when needed.
- Keep humans in the loop for actions that are hard to undo.
- Log every tool call so you can debug and evaluate behaviour.

## Multi-agent systems
A coordinator (orchestrator) agent delegates to specialist agents, for example a roadmap agent, a quiz agent and a review agent. Each specialist has a focused prompt, which usually improves quality and makes each part easier to test.

## Model Context Protocol (MCP)
MCP is an open standard, introduced by Anthropic, for connecting AI applications to tools and data. An **MCP server** exposes tools (actions), resources (data) and prompts. An **MCP client**, inside an AI app, discovers and calls them. Because the protocol is shared, one server (say, a calendar or GitHub server) works with any MCP-compatible app instead of needing a custom integration per app.

## Tool calling
With tool calling, the developer describes each tool with a name, a description and a JSON schema for its inputs. The model replies with a structured tool call; the application runs the tool and sends the result back. The model never executes code itself, the application does.
