<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- App data (tasks, research, chats) lives in browser localStorage via `src/lib/local-store.ts` stores; UI reads them only through those store hooks so a later move to a database touches one layer. Why: Lovable Cloud could not be enabled at build time.
- All AI calls run server-side in `src/routes/api/*` through `src/lib/ai/gateway.server.ts` (Responses API, streamed); browser code uses `src/lib/ai/client.ts` or `useChat`. Why: keeps the API key and prompts off the client.
- Chat threads use a real route `/chat/$threadId`, created lazily on first message. Why: reload restores the same thread without duplicate blank threads.
- Store-backed UI must gate on `useHydrated()` (or the store's server snapshot) before showing data. Why: avoids SSR hydration mismatches.
