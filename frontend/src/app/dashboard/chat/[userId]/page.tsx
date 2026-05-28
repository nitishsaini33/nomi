'use client'
import ChatWindow from '@/components/ChatWindow';
import { useAuth } from '@/hooks/useAuth';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const { user } = useAuth();
  const userId = params.userId as string;

  if (!user) return null;

  return <ChatWindow currentUser={user} otherUserId={userId} />;
}
