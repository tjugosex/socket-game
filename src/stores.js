import { writable } from 'svelte/store';

export const prompt = writable('');
export const selectedImageUrl = writable('');
export const nickname = writable('');
export const host = writable(false);