import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateRoomCode(): string {
  const words = [
    "KOALA", "LLAMA", "PANDA", "TAPIR", "BISON", "GECKO", "HERON",
    "MANGO", "ONION", "PESTO", "QUAIL", "STOAT", "TROUT", "VIPER",
    "WALTZ", "YACHT", "ZEBRA", "AVOCADO", "BADGER", "CONDOR",
  ];
  return words[Math.floor(Math.random() * words.length)];
}

export function generateToken(): string {
  return crypto.randomUUID();
}
