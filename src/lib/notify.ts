/** Desktop notification (best effort — never throws). */
export async function notifyDesktop(title: string, message: string): Promise<boolean> {
  try {
    const mod = await import("node-notifier");
    const notifier = (mod.default ?? mod) as { notify: (o: object, cb?: (err: unknown) => void) => void };
    return await new Promise((resolve) => {
      notifier.notify({ title, message, appID: "Türkçe 365", wait: false }, (err) => resolve(!err));
      setTimeout(() => resolve(true), 5000);
    });
  } catch {
    return false;
  }
}
