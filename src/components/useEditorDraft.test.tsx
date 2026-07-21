import { describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useEditorDraft } from './useEditorDraft'

describe('useEditorDraft', () => {
  it('starts clean, becomes dirty when the draft diverges from initial', () => {
    const { result } = renderHook(() =>
      useEditorDraft({ initial: { a: 1 }, onClose: vi.fn(), save: vi.fn(async () => {}) }),
    )
    expect(result.current.dirty).toBe(false)
    act(() => result.current.setDraft({ a: 2 }))
    expect(result.current.dirty).toBe(true)
    act(() => result.current.setDraft({ a: 1 }))
    expect(result.current.dirty).toBe(false) // structural equality, not reference
  })

  it('an unchanged save closes without calling the seam', async () => {
    const onClose = vi.fn()
    const save = vi.fn(async () => {})
    const { result } = renderHook(() => useEditorDraft({ initial: { a: 1 }, onClose, save }))
    await act(async () => {
      await result.current.onSave()
    })
    expect(save).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('a dirty save runs the seam with the current draft, then closes', async () => {
    const onClose = vi.fn()
    const save = vi.fn(async () => {})
    const { result } = renderHook(() => useEditorDraft({ initial: { a: 1 }, onClose, save }))
    act(() => result.current.setDraft({ a: 2 }))
    await act(async () => {
      await result.current.onSave()
    })
    expect(save).toHaveBeenCalledWith({ a: 2 })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('surfaces a thrown save error, stays open, and clears the saving flag', async () => {
    const onClose = vi.fn()
    const save = vi.fn(async () => {
      throw new Error('disk full')
    })
    const { result } = renderHook(() => useEditorDraft({ initial: { a: 1 }, onClose, save }))
    act(() => result.current.setDraft({ a: 2 }))
    await act(async () => {
      await result.current.onSave()
    })
    await waitFor(() => expect(result.current.error).toBe('disk full'))
    expect(onClose).not.toHaveBeenCalled()
    expect(result.current.saving).toBe(false)
  })

  it('onClear runs the clear seam and closes; is a no-op when no clear is supplied', async () => {
    const onClose = vi.fn()
    const clear = vi.fn(async () => {})
    const { result } = renderHook(() =>
      useEditorDraft({ initial: { a: 1 }, onClose, save: vi.fn(async () => {}), clear }),
    )
    await act(async () => {
      await result.current.onClear()
    })
    expect(clear).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()

    const onClose2 = vi.fn()
    const { result: r2 } = renderHook(() =>
      useEditorDraft({ initial: { a: 1 }, onClose: onClose2, save: vi.fn(async () => {}) }),
    )
    await act(async () => {
      await r2.current.onClear()
    })
    expect(onClose2).not.toHaveBeenCalled()
  })

  it('honours a custom isDirty for drafts whose shape differs from the stored value', () => {
    const isDirty = vi.fn(() => true)
    const { result } = renderHook(() =>
      useEditorDraft({ initial: { a: 1 }, onClose: vi.fn(), save: vi.fn(async () => {}), isDirty }),
    )
    expect(result.current.dirty).toBe(true)
    expect(isDirty).toHaveBeenCalled()
  })
})
