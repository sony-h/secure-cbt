import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AudioStimulusField } from '../audio-stimulus-field';
import { uploadApi } from '@/lib/api-service';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/api-service', () => ({
  uploadApi: {
    uploadAudio: vi.fn(),
  },
}));

describe('AudioStimulusField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload dropzone when no audio is uploaded', () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <AudioStimulusField
        audioUrl={null}
        playLimit={2}
        onAudioUploaded={onUpload}
        onAudioRemoved={onRemove}
        onPlayLimitChange={onLimitChange}
      />,
    );

    expect(screen.getByText(/Klik untuk unggah/i)).toBeDefined();
    expect(screen.getByText(/Batas Pemutaran Soal \(Play Limit\)/i)).toBeDefined();
  });

  it('uploads a valid mp3 file successfully', async () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const onLimitChange = vi.fn();

    (uploadApi.uploadAudio as any).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          url: 'https://example.com/audio/listening-task.mp3',
        },
      },
    });

    const { container } = render(
      <AudioStimulusField
        audioUrl={null}
        playLimit={2}
        onAudioUploaded={onUpload}
        onAudioRemoved={onRemove}
        onPlayLimitChange={onLimitChange}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-audio-content'], 'listening-task.mp3', { type: 'audio/mpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(uploadApi.uploadAudio).toHaveBeenCalledWith(file);
      expect(onUpload).toHaveBeenCalledWith('https://example.com/audio/listening-task.mp3');
      expect(toast.success).toHaveBeenCalledWith('Audio stimulus berhasil diunggah');
    });
  });

  it('shows error toast when uploading unsupported file format', async () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const onLimitChange = vi.fn();

    const { container } = render(
      <AudioStimulusField
        audioUrl={null}
        playLimit={2}
        onAudioUploaded={onUpload}
        onAudioRemoved={onRemove}
        onPlayLimitChange={onLimitChange}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['document-content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(uploadApi.uploadAudio).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Format audio tidak didukung'),
    );
  });

  it('shows error toast when audio exceeds 25MB', async () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const onLimitChange = vi.fn();

    const { container } = render(
      <AudioStimulusField
        audioUrl={null}
        playLimit={2}
        onAudioUploaded={onUpload}
        onAudioRemoved={onRemove}
        onPlayLimitChange={onLimitChange}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const oversizedFile = new File([''], 'huge.mp3', { type: 'audio/mpeg' });
    Object.defineProperty(oversizedFile, 'size', { value: 26 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(uploadApi.uploadAudio).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Ukuran audio maksimal 25MB');
  });

  it('renders audio player preview when audioUrl is present and handles remove', () => {
    const onUpload = vi.fn();
    const onRemove = vi.fn();
    const onLimitChange = vi.fn();

    render(
      <AudioStimulusField
        audioUrl="https://example.com/audio/exam-listening.mp3"
        playLimit={2}
        onAudioUploaded={onUpload}
        onAudioRemoved={onRemove}
        onPlayLimitChange={onLimitChange}
      />,
    );

    expect(screen.getByText(/Audio Stimulus Soal/i)).toBeDefined();
    expect(screen.getByText(/exam-listening.mp3/i)).toBeDefined();
    expect(screen.getByText(/Siap Diputar/i)).toBeDefined();

    const removeBtn = screen.getByRole('button', { name: /Hapus Audio/i });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
