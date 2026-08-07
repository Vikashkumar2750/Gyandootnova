import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CustomScript {
  id: string;
  placement: "head" | "body";
  content: string;
  position: number;
}

const INJECTED_ATTR = "data-custom-script-id";

/**
 * Parses the script HTML string and injects it into the target node.
 * Re-creates <script> tags so they actually execute (innerHTML doesn't run scripts).
 */
const injectScriptHTML = (html: string, target: HTMLElement, scriptId: string) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;

  Array.from(wrapper.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === "SCRIPT") {
      const oldScript = node as HTMLScriptElement;
      const newScript = document.createElement("script");
      // Copy attributes
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.text = oldScript.text;
      newScript.setAttribute(INJECTED_ATTR, scriptId);
      target.appendChild(newScript);
    } else {
      const clone = node.cloneNode(true) as HTMLElement;
      if (clone.setAttribute) clone.setAttribute(INJECTED_ATTR, scriptId);
      target.appendChild(clone);
    }
  });
};

const removeInjectedScripts = () => {
  document.querySelectorAll(`[${INJECTED_ATTR}]`).forEach((el) => el.remove());
};

export const useCustomScripts = () => {
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("custom_scripts")
        .select("id, placement, content, position")
        .eq("enabled", true)
        .order("position", { ascending: true });

      if (cancelled || error || !data) return;

      removeInjectedScripts();

      (data as CustomScript[]).forEach((script) => {
        const target = script.placement === "head" ? document.head : document.body;
        try {
          injectScriptHTML(script.content, target, script.id);
        } catch (err) {
          console.error("Failed to inject custom script", script.id, err);
        }
      });
    };

    void load();

    return () => {
      cancelled = true;
      removeInjectedScripts();
    };
  }, []);
};
