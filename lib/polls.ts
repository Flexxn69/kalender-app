// Polls/Umfragen für Gruppen
export type Poll = {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  createdBy: string;
  groupId: string;
  createdAt: string;
  closed: boolean;
}

export function createPoll(question: string, options: string[], groupId: string, userId: string): Poll {
  return {
    id: Math.random().toString(36).slice(2),
    question,
    options: options.map((text, i) => ({ id: 'opt'+i, text, votes: [] })),
    createdBy: userId,
    groupId,
    createdAt: new Date().toISOString(),
    closed: false
  }
}
