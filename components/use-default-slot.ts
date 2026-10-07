"use client";
import { useSyncExternalStore } from "react";
import { defaultSlot, type Slot } from "@/lib/budget";

const noop = () => () => {};

/** Meal slot suggested by the user's local time. Hydration-safe: the server render uses "lunch". */
export const useDefaultSlot = (): Slot =>
  useSyncExternalStore(noop, () => defaultSlot(new Date().getHours()), () => "lunch");
