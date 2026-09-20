"use client";

import { createContext, useContext, type TransitionStartFunction } from "react";

export const ListTransitionContext = createContext<TransitionStartFunction | null>(null);

export function useListTransition() {
  return useContext(ListTransitionContext);
}
