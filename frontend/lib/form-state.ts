export const INITIAL_FORM_STATE: FormState = { status: "idle" };

export type FormState = {
  status: "idle" | "error" | "success";
  error?: string;
};