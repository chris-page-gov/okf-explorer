(() => {
  "use strict";

  const fallbackCopy = (text) => {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.inset = "-9999px auto auto -9999px";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("The browser rejected the copy command.");
  };

  const copyPrompt = async (button) => {
    const targetId = button.dataset.copyTarget;
    const source = targetId ? document.getElementById(targetId) : null;
    const status = document.getElementById("copy-prompt-status");
    if (!(source instanceof HTMLTextAreaElement) || !status) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(source.value);
      } else {
        fallbackCopy(source.value);
      }
      status.textContent = "Full prompt copied.";
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = "Copy full prompt";
      }, 2500);
    } catch {
      status.textContent =
        "Copy failed. Use “Download plain text”, then select and copy the prompt.";
    }
  };

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof HTMLButtonElement && target.matches(".copy-prompt")) {
      void copyPrompt(target);
    }
  });
})();
