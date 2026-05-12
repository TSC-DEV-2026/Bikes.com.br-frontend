import { toast } from "sonner";

type ToastDescription = string | undefined;

const baseOptions = {
  duration: 4000,
};

export function notifySuccess(message: string, description?: ToastDescription) {
  return toast.success(message, {
    ...baseOptions,
    ...(description ? { description } : null),
  });
}

export function notifyError(message: string, description?: ToastDescription) {
  return toast.error(message, {
    ...baseOptions,
    ...(description ? { description } : null),
  });
}

export function notifyInfo(message: string, description?: ToastDescription) {
  return toast(message, {
    ...baseOptions,
    ...(description ? { description } : null),
  });
}

export function notifyWarning(message: string, description?: ToastDescription) {
  return toast.warning(message, {
    ...baseOptions,
    ...(description ? { description } : null),
  });
}

