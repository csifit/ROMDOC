"use client";

import {
  useEffect,
} from "react";

import {
  restoreDirectoryState,
  saveDirectoryState,
  shouldSaveDirectoryStateForHref,
} from "@/lib/directory/directory-state";

function findAnchor(
  target: EventTarget | null
) {
  if (
    !(target instanceof Element)
  ) {
    return null;
  }

  return target.closest(
    "a[href]"
  ) as HTMLAnchorElement | null;
}

export default function DirectoryStateRestorer() {
  useEffect(() => {
    restoreDirectoryState();

    function handleClick(
      event: MouseEvent
    ) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor =
        findAnchor(
          event.target
        );

      if (
        !anchor ||
        anchor.target ===
          "_blank" ||
        !shouldSaveDirectoryStateForHref(
          anchor.href
        )
      ) {
        return;
      }

      saveDirectoryState();
    }

    document.addEventListener(
      "click",
      handleClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, []);

  return null;
}
