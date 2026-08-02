import { prisma, generateId } from "./client";
import type { Conversation, Message, UserRole } from "../types";

type ConversationRow = {
  id: string;
  staff_user_id: string;
  student_user_id: string;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: Date;
};

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    staffUserId: row.staff_user_id,
    studentUserId: row.student_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    messageType: row.message_type as Message["messageType"],
    content: row.content,
    fileUrl: row.file_url,
    fileName: row.file_name,
    createdAt: row.created_at,
  };
}

export async function getOrCreateConversation(staffUserId: string, studentUserId: string): Promise<Conversation> {
  const conversation = await prisma.conversation.upsert({
    where: { staff_user_id_student_user_id: { staff_user_id: staffUserId, student_user_id: studentUserId } },
    update: {},
    create: { id: generateId(), staff_user_id: staffUserId, student_user_id: studentUserId },
  });
  return mapConversation(conversation);
}

export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  return conversation ? mapConversation(conversation) : null;
}

/** محادثات الموظف مع الطلبة (للأدمن/مساعد) */
export async function getConversationsByStaffId(staffUserId: string): Promise<(Conversation & { studentName?: string })[]> {
  const rows = await prisma.conversation.findMany({
    where: { staff_user_id: staffUserId },
    orderBy: { updated_at: "desc" },
    include: { User_Conversation_student_user_idToUser: { select: { name: true } } },
  });
  return rows.map((r) => ({
    ...mapConversation(r),
    studentName: r.User_Conversation_student_user_idToUser.name,
  }));
}

/** محادثات الطالب (الرسائل الواردة من الموظفين) */
export async function getConversationsByStudentId(studentUserId: string): Promise<(Conversation & { staffName?: string; staffRole?: string })[]> {
  const rows = await prisma.conversation.findMany({
    where: { student_user_id: studentUserId },
    orderBy: { updated_at: "desc" },
    include: { User_Conversation_staff_user_idToUser: { select: { name: true, role: true } } },
  });
  return rows.map((r) => ({
    ...mapConversation(r),
    staffName: r.User_Conversation_staff_user_idToUser.name,
    staffRole: r.User_Conversation_staff_user_idToUser.role,
  }));
}

/** قائمة الموظفين الذين يمكن للطالب مراسلتهم (أدمن + مساعد أدمن) */
export async function getStaffForStudentMessaging(): Promise<{ id: string; role: string }[]> {
  const rows = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "ASSISTANT_ADMIN"] } },
    orderBy: { role: "asc" },
    select: { id: true, role: true },
  });
  return rows;
}

export async function canUserAccessConversation(userId: string, role: UserRole, conversation: Conversation): Promise<boolean> {
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
    return conversation.staffUserId === userId;
  }
  if (role === "STUDENT") return conversation.studentUserId === userId;
  return false;
}

export async function getMessageById(messageId: string): Promise<Message | null> {
  const message = await prisma.message.findUnique({ where: { id: messageId } });
  return message ? mapMessage(message) : null;
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const rows = await prisma.message.findMany({
    where: { conversation_id: conversationId },
    orderBy: { created_at: "asc" },
  });
  return rows.map(mapMessage);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await prisma.message.deleteMany({ where: { id: messageId } });
}

export async function createMessage(data: {
  conversation_id: string;
  sender_id: string;
  message_type: "text" | "image" | "file";
  content?: string | null;
  file_url?: string | null;
  file_name?: string | null;
}): Promise<Message> {
  const id = generateId();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        id,
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        message_type: data.message_type,
        content: data.content ?? null,
        file_url: data.file_url ?? null,
        file_name: data.file_name ?? null,
      },
    }),
    prisma.conversation.update({ where: { id: data.conversation_id }, data: { updated_at: new Date() } }),
  ]);
  return mapMessage(message);
}
