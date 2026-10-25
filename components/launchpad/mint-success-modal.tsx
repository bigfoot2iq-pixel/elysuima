"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  Copy,
  ImageOff,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { XLogo } from "@/components/x-logo";
import { collectionImageUrl } from "@/lib/collection/art";
import { cn } from "@/lib/utils";

type ArtworkStatus = "loading" | "loaded" | "error";

/** Where "go mint yours" points to in the share post. */
const SHARE_URL = "https://www.elyziuma.xyz/launchpad";

/**
 * The artwork can take a while to arrive (the hosted PNGs are large), so it
 * gets its own component: the modal can name the token immediately while the
 * image loads behind a skeleton, then fade it in. Keyed by URL, so minting
 * another token starts from a clean loading state.
 */
function MintedArtwork({
  imageUrl,
  tokenLabel,
}: {
  imageUrl: string;
  tokenLabel: string;
}) {
  const [status, setStatus] = useState<ArtworkStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  // The gateway art is immutable, so a retry only needs a cache-busting query
  // to make Next.js fetch the image again instead of reusing a failed entry.
  const src =
    attempt > 0
      ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}retry=${attempt}`
      : imageUrl;

  return (
    <div
      aria-busy={status === "loading"}
      className="relative mt-2 aspect-square overflow-hidden rounded-2xl border border-paper/10 bg-ink-2"
    >
      <Image
        key={src}
        src={src}
        alt={`${tokenLabel} artwork`}
        fill
        loading="eager"
        fetchPriority="high"
        sizes="(max-width: 640px) 90vw, 420px"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={cn(
          "object-cover transition-[opacity,transform] duration-700 ease-out",
          status === "loaded"
            ? "scale-100 opacity-100"
            : "scale-[1.02] opacity-0",
        )}
      />

      {status === "loading" ? (
        <div className="absolute inset-0 grid place-items-center overflow-hidden bg-ink-2">
          <div
            aria-hidden
            className="animate-shimmer absolute inset-0 bg-[linear-gradient(100deg,transparent_25%,rgba(125,240,196,0.07)_45%,rgba(255,255,255,0.06)_50%,rgba(125,240,196,0.07)_55%,transparent_75%)]"
          />
          <div
            role="status"
            aria-live="polite"
            className="relative flex flex-col items-center gap-2.5 text-center"
          >
            <span className="grid size-10 place-items-center rounded-full border border-brand/25 bg-ink/70 text-brand shadow-[0_0_24px_rgba(124,216,242,0.18)]">
              <Loader2 className="size-4 animate-spin" />
            </span>
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-paper-mute">
              Loading artwork
            </span>
          </div>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-ink-2/95 p-6 text-center">
          <ImageOff className="size-5 text-paper-mute" />
          <p className="text-[11px] leading-5 text-paper-mute">
            The artwork couldn&apos;t load.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setAttempt((current) => current + 1);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/[0.03] px-2.5 py-1 font-mono text-[10px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-brand"
          >
            <RefreshCw className="size-3" />
            Try again
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Mint confirmation. The image is the actual on-chain artwork for the token
 * that was just minted, resolved from the pinned IPFS image folder.
 */
export function MintSuccessModal({
  open,
  tokenId,
  quantity,
  onClose,
}: {
  open: boolean;
  tokenId?: bigint;
  quantity: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  const imageUrl =
    tokenId !== undefined ? collectionImageUrl(tokenId) : undefined;
  const tokenLabel =
    tokenId !== undefined ? `Elyziuma #${tokenId}` : "Elyziuma";
  const title =
    tokenId !== undefined
      ? quantity === 1
        ? `${tokenLabel} is yours`
        : `${quantity} Elyziuma NFTs are yours`
      : "Mint confirmed";
  const shareText =
    tokenId !== undefined
      ? quantity === 1
        ? `I just minted ${tokenLabel} on Elysium. go mint yours at ${SHARE_URL}`
        : `I just minted ${quantity} Elyziuma NFTs on Elysium. go mint yours at ${SHARE_URL}`
      : `I just minted Elyziuma on Elysium. go mint yours at ${SHARE_URL}`;
  const shareHref = `https://x.com/intent/tweet?text=${encodeURIComponent(
    shareText,
  )}`;

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") handleClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleClose]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );

  if (!open) return null;
  if (typeof document === "undefined") return null;

  async function copyImageLink() {
    if (!imageUrl) return;

    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the link stays visible for manual copy.
    }
  }

  function trapFocus(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-ink/85 backdrop-blur-md"
      onClick={handleClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="mint-success-title"
          aria-describedby="mint-success-description"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={trapFocus}
          className="glass card-sheen relative w-full max-w-[460px] overflow-hidden rounded-[28px] border border-mint/20 p-4 shadow-[0_40px_120px_-24px_rgba(0,0,0,0.95)] sm:p-5"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={handleClose}
            aria-label="Close mint confirmation"
            className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-paper/10 bg-ink/60 text-paper-dim transition hover:border-paper/25 hover:text-paper"
          >
            <X className="size-4" />
          </button>

          <div className="flex flex-col items-center px-2 pt-3 text-center">
            <span className="grid size-11 place-items-center rounded-full border border-mint/30 bg-mint/10 text-mint shadow-[0_0_30px_rgba(125,240,196,0.2)]">
              <Check className="size-5" />
            </span>
            <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-mint">
              Mint confirmed
            </p>
            <h2
              id="mint-success-title"
              className="mt-1.5 font-display text-xl font-extrabold tracking-[-0.03em] text-paper sm:text-2xl"
            >
              {title}
            </h2>
            <p
              id="mint-success-description"
              className="mt-1 text-[11px] leading-5 text-paper-mute"
            >
              {quantity === 1
                ? "Your NFT is in your wallet."
                : `${quantity} NFTs are in your wallet.`}{" "}
              Minted on Elysium.
            </p>
          </div>

          {imageUrl ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-paper/15 bg-ink/60 px-2.5 py-1 font-mono text-[10px] font-semibold text-paper">
                  {tokenLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  <a
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/[0.03] px-2.5 py-1 font-mono text-[10px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-brand"
                  >
                    Open image
                    <ArrowUpRight className="size-3" />
                  </a>
                  <button
                    type="button"
                    onClick={copyImageLink}
                    aria-label="Copy NFT image link"
                    className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/[0.03] px-2.5 py-1 font-mono text-[10px] font-semibold text-paper-dim transition hover:border-brand/40 hover:text-brand"
                  >
                    {copied ? (
                      <Check className="size-3 text-mint" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <MintedArtwork
                key={imageUrl}
                imageUrl={imageUrl}
                tokenLabel={tokenLabel}
              />

              <p className="mt-2 text-center text-[10px] text-paper-mute">
                Screenshot this card to share your mint.
              </p>
            </div>
          ) : null}

          <div className="mt-4 grid gap-2">
            <a
              href={shareHref}
              target="_blank"
              rel="noreferrer"
              className="btn-primary w-full"
            >
              <XLogo className="size-4" />
              Share on X
            </a>
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost w-full"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
