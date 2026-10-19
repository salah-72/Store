import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'

export interface Admin { id: number; username: string }

export function useAdmins() {
  return useQuery({
    queryKey: ['admins'],
    queryFn: async () => (await api.get('/auth/admins')).data.data.admins as Admin[],
  })
}

export function useCreateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { username: string; password: string }) => (await api.post('/auth/newAdmin', input)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  })
}

export function useDeleteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => { await api.delete(`/auth/${id}`) },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admins'] }),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { oldPassword: string; newPassword: string; passwordConfirm: string }) =>
      (await api.patch('/auth/password', input)).data,
  })
}
