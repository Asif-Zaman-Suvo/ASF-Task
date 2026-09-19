export type PersonRef = {
  id: string;
  name: string;
};

export type RequestListItem = {
  id: string;
  number: number;
  displayId: string;
  title: string;
  requester: PersonRef;
  category: { id: string; name: string };
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignee: PersonRef | null;
  updatedAt: string;
};

export type ActivityItem = {
  id: string;
  type: "CREATED" | "STATUS_CHANGED" | "ASSIGNEE_CHANGED";
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  actor: PersonRef;
  assigneeId: string | null;
  requestId: string;
};

export type RequestDetail = RequestListItem & {
  description: string;
  createdAt: string;
  activities: ActivityItem[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ListRequestsResult = {
  data: RequestListItem[];
  meta: PaginationMeta;
};
