import { trpc } from '../client.js';

export const useSendConnectionRequest = () => trpc.connection.sendRequest.useMutation();

export const useAcceptConnectionRequest = () => trpc.connection.acceptRequest.useMutation();

export const useRejectConnectionRequest = () => trpc.connection.rejectRequest.useMutation();

export const useConnections = (athleteId: string) =>
  trpc.connection.listConnections.useQuery({ athleteId });
