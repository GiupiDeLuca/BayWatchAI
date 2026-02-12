import {
  TrioCheckOnceRequest,
  TrioCheckOnceResponse,
  TrioLiveMonitorRequest,
  TrioLiveMonitorResponse,
  TrioJobInfo,
  TrioStreamValidation,
  TrioPrepareStreamResponse,
} from '@/types';

const BASE_URL = process.env.TRIO_BASE_URL || 'https://trio.machinefi.com/api';
const API_KEY = process.env.TRIO_API_KEY || '';

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function trioFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: headers(options.headers as Record<string, string>),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[trio-client] ${options.method || 'GET'} ${path} → ${res.status}:`, body);
    throw new Error(`Trio API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// ===== Monitoring Endpoints =====

/**
 * Single synchronous condition check on a YouTube Live stream.
 * Does NOT consume a job slot.
 */
export async function checkOnce(
  streamUrl: string,
  condition: string,
): Promise<TrioCheckOnceResponse> {
  return trioFetch<TrioCheckOnceResponse>('/check-once', {
    method: 'POST',
    body: JSON.stringify({
      stream_url: streamUrl,
      condition,
    } satisfies TrioCheckOnceRequest),
  });
}

/**
 * Start a continuous monitoring job with webhook notifications.
 * Consumes 1 job slot. Auto-stops after 10 minutes.
 */
export async function startLiveMonitor(
  streamUrl: string,
  condition: string,
  webhookUrl: string,
): Promise<TrioLiveMonitorResponse> {
  return trioFetch<TrioLiveMonitorResponse>('/live-monitor', {
    method: 'POST',
    body: JSON.stringify({
      stream_url: streamUrl,
      condition,
      webhook_url: webhookUrl,
    } satisfies TrioLiveMonitorRequest),
  });
}

/**
 * Start a live digest job that generates periodic narrative summaries via SSE.
 * Consumes 1 job slot. Returns a ReadableStream of SSE events.
 */
export async function startLiveDigest(
  streamUrl: string,
  options?: {
    window_minutes?: number;
    capture_interval_seconds?: number;
  },
): Promise<Response> {
  const url = `${BASE_URL}/live-digest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      stream_url: streamUrl,
      ...options,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[trio-client] POST /live-digest → ${res.status}:`, body);
    throw new Error(`Trio API error ${res.status}: ${body}`);
  }

  // Return the raw Response so the caller can consume the SSE stream
  return res;
}

// ===== Job Management Endpoints =====

/**
 * List all jobs with optional status and type filters.
 */
export async function listJobs(filters?: {
  status?: 'pending' | 'running' | 'stopped' | 'completed' | 'failed';
  type?: 'live-monitor' | 'live-digest';
  limit?: number;
}): Promise<{ jobs: TrioJobInfo[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const path = `/jobs${query ? `?${query}` : ''}`;
  return trioFetch<{ jobs: TrioJobInfo[]; total: number }>(path);
}

/**
 * Get detailed status and statistics for a specific job.
 */
export async function getJob(jobId: string): Promise<TrioJobInfo> {
  return trioFetch<TrioJobInfo>(`/jobs/${jobId}`);
}

/**
 * Cancel a running job immediately.
 */
export async function cancelJob(jobId: string): Promise<{
  job_id: string;
  status: string;
  message: string;
  final_stats?: {
    checks_performed: number;
    triggers_fired: number;
    frames_skipped: number;
  };
}> {
  return trioFetch(`/jobs/${jobId}`, { method: 'DELETE' });
}

// ===== Stream Utility Endpoints =====

/**
 * Validate a stream URL and return rich metadata.
 */
export async function validateStream(
  streamUrl: string,
): Promise<TrioStreamValidation> {
  return trioFetch<TrioStreamValidation>('/streams/validate', {
    method: 'POST',
    body: JSON.stringify({ stream_url: streamUrl }),
  });
}

/**
 * Cache a stream URL and get embed information for preview.
 */
export async function prepareStream(
  streamUrl: string,
): Promise<TrioPrepareStreamResponse> {
  return trioFetch<TrioPrepareStreamResponse>('/prepare-stream', {
    method: 'POST',
    body: JSON.stringify({ url: streamUrl }),
  });
}

// ===== Convenience =====

/**
 * Cancel all running jobs. Useful for cleanup.
 */
export async function cancelAllJobs(): Promise<number> {
  const { jobs } = await listJobs({ status: 'running' });
  let cancelled = 0;
  for (const job of jobs) {
    try {
      await cancelJob(job.job_id);
      cancelled++;
    } catch (err) {
      console.error(`[trio-client] Failed to cancel job ${job.job_id}:`, err);
    }
  }
  return cancelled;
}
