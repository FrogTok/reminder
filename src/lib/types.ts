export type ReminderDto = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "PENDING" | "DONE";
  createdAt: string;
  completedAt: string | null;
  streamerId: string;
  createdById: string;
  createdBy: { displayName: string };
  completedBy: { displayName: string } | null;
};

export type StreamerSummary = {
  id: string;
  displayName: string;
  username: string;
};
