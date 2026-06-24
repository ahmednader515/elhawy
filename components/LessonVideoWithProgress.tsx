"use client";

import { PlyrVideoPlayer } from "@/components/plyr-video-player";
import { WizardToast } from "@/components/WizardToast";
import { useLessonComplete } from "@/components/LessonProgressClient";

type Props = {
  lessonId: string;
  youtubeVideoId: string;
  storageKey: string;
  className?: string;
  isStudent: boolean;
  initialCompleted: boolean;
};

export function LessonVideoWithProgress({
  lessonId,
  youtubeVideoId,
  storageKey,
  className,
  isStudent,
  initialCompleted,
}: Props) {
  const { toast, setToast, completeLesson } = useLessonComplete(
    lessonId,
    isStudent,
    initialCompleted,
  );

  return (
    <>
      <PlyrVideoPlayer
        youtubeVideoId={youtubeVideoId}
        storageKey={storageKey}
        className={className}
        onEnded={isStudent ? () => void completeLesson() : undefined}
      />
      {toast ? (
        <WizardToast
          message={toast.message}
          subMessage={toast.subMessage}
          onDismiss={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
