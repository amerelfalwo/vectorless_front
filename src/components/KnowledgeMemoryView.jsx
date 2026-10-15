import { useState, useEffect, useCallback } from 'react'
import {
  Brain,
  RefreshCw,
  Sparkles,
  BookOpen,
  FileText,
  Tag,
  CheckCircle2,
  Clock,
  MessageSquare,
  Search,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchGlobalKnowledge, refreshGlobalKnowledge } from '../api/client.js'

export function KnowledgeMemoryView({ onStartChatWithDoc, onAskAboutKnowledge }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('all')

  const loadKnowledge = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchGlobalKnowledge()
      setData(res)
    } catch (err) {
      console.error('Failed to load global knowledge:', err)
      toast.error('Failed to load global knowledge memory.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadKnowledge()
  }, [loadKnowledge])

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      const res = await refreshGlobalKnowledge()
      setData(res)
      toast.success('Collective knowledge memory synthesized successfully!')
    } catch (err) {
      console.error('Failed to refresh knowledge:', err)
      toast.error('Synthesis failed. Please verify API availability.')
    } finally {
      setRefreshing(false)
    }
  };

  const dossiers = data?.dossiers || []
  const collectiveSummary = data?.collective_summary || ''
  const keyInsights = data?.key_insights || []
  const totalDocuments = data?.total_documents ?? dossiers.length
  const updatedAt = data?.updated_at
    ? new Date(data.updated_at * 1000).toLocaleString()
    : 'Recently'

  // Extract all unique topics across all dossiers
  const allTopics = Array.from(
    new Set(dossiers.flatMap((d) => d.topics || []))
  )

  const filteredDossiers = dossiers.filter((d) => {
    const matchesSearch =
      (d.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.executive_summary || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.key_entities || []).some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesTopic =
      selectedTopic === 'all' || (d.topics || []).includes(selectedTopic)

    return matchesSearch && matchesTopic
  })

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-[#F7F6F1] p-4 md:p-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#E4E5DE] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#285943] text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-[#262B27]">
                  Collective Knowledge Memory
                </h1>
                <p className="text-xs text-[#777D76]">
                  Synthesized workspace intelligence across all indexed documents
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 rounded-xl bg-white border border-[#E4E5DE] px-4 py-2 text-xs font-medium text-[#262B27] shadow-2xs transition hover:bg-[#F7F6F1] hover:border-[#285943] disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-[#285943]' : ''}`} />
              <span>{refreshing ? 'Synthesizing...' : 'Refresh Synthesis'}</span>
            </button>

            {onAskAboutKnowledge && (
              <button
                type="button"
                onClick={() => onAskAboutKnowledge(collectiveSummary)}
                className="flex items-center gap-2 rounded-xl bg-[#285943] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#1e4533]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask Across Knowledge</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#E4E5DE] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#777D76]">
              <span>Indexed Documents</span>
              <BookOpen className="h-4 w-4 text-[#285943]" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#262B27]">
              {totalDocuments}
            </div>
            <div className="mt-1 text-[11px] text-[#777D76]">
              With structured knowledge dossiers
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E5DE] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#777D76]">
              <span>Synthesized Insights</span>
              <Sparkles className="h-4 w-4 text-[#8DAA91]" />
            </div>
            <div className="mt-2 text-2xl font-serif font-bold text-[#262B27]">
              {keyInsights.length}
            </div>
            <div className="mt-1 text-[11px] text-[#777D76]">
              Cross-cutting cross-document themes
            </div>
          </div>

          <div className="rounded-2xl border border-[#E4E5DE] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#777D76]">
              <span>Memory Synchronized</span>
              <Clock className="h-4 w-4 text-[#777D76]" />
            </div>
            <div className="mt-2 text-sm font-medium text-[#262B27] truncate">
              {updatedAt}
            </div>
            <div className="mt-1 text-[11px] text-[#777D76]">
              Persisted in workspace SQLite memory
            </div>
          </div>
        </div>

        {/* Master Collective Summary Banner */}
        <div className="rounded-2xl border border-[#285943]/20 bg-gradient-to-br from-[#E8F0E8]/70 via-white to-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#285943]">
            <Brain className="h-4 w-4" />
            <span>Workspace Master Knowledge Synthesis</span>
          </div>

          <div className="mt-3 text-sm leading-relaxed text-[#262B27] whitespace-pre-line font-normal">
            {loading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : collectiveSummary ? (
              collectiveSummary
            ) : (
              'No collective summary generated yet. Upload and index documents to automatically build your workspace knowledge memory.'
            )}
          </div>

          {keyInsights.length > 0 && (
            <div className="mt-5 border-t border-[#E4E5DE]/80 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#777D76] mb-3">
                Key Cross-Cutting Insights
              </h3>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 rounded-xl border border-[#E4E5DE] bg-white p-3 text-xs text-[#262B27] shadow-2xs"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#285943] mt-0.5" />
                    <span className="leading-snug">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Document Knowledge Dossiers Section */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-[#262B27]">
                Document Knowledge Dossiers ({dossiers.length})
              </h2>
              <p className="text-xs text-[#777D76]">
                Deep structured extraction per indexed document
              </p>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#777D76]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter dossiers..."
                  className="rounded-xl border border-[#E4E5DE] bg-white pl-8 pr-3 py-1.5 text-xs text-[#262B27] placeholder:text-[#777D76] focus:border-[#285943] focus:outline-none"
                />
              </div>

              {allTopics.length > 0 && (
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="rounded-xl border border-[#E4E5DE] bg-white px-3 py-1.5 text-xs text-[#262B27] focus:border-[#285943] focus:outline-none"
                >
                  <option value="all">All Topics</option>
                  {allTopics.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {filteredDossiers.length === 0 ? (
            <div className="rounded-2xl border border-[#E4E5DE] bg-white p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-[#777D76] opacity-50" />
              <p className="mt-2 text-sm text-[#777D76]">
                {dossiers.length === 0
                  ? 'No document dossiers generated yet. Ingest documents to create memory dossiers.'
                  : 'No dossiers match your search filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredDossiers.map((dossier) => (
                <div
                  key={dossier.doc_id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E4E5DE] bg-white p-5 shadow-2xs hover:border-[#8DAA91] transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 shrink-0 text-[#285943]" />
                        <h3 className="truncate font-medium text-sm text-[#262B27]">
                          {dossier.filename}
                        </h3>
                      </div>
                      {onStartChatWithDoc && (
                        <button
                          type="button"
                          onClick={() => onStartChatWithDoc(dossier.doc_id, dossier.filename)}
                          title="Start dedicated research chat with this document"
                          className="flex items-center gap-1 rounded-lg bg-[#E8F0E8] px-2.5 py-1 text-[11px] font-medium text-[#285943] hover:bg-[#285943] hover:text-white transition"
                        >
                          <MessageSquare className="h-3 w-3" />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>

                    {/* Executive Summary */}
                    <p className="text-xs leading-relaxed text-[#777D76] line-clamp-3">
                      {dossier.executive_summary}
                    </p>

                    {/* Key Findings */}
                    {dossier.key_findings && dossier.key_findings.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#777D76]">
                          Key Findings
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-[#262B27]">
                          {dossier.key_findings.slice(0, 2).map((f, i) => (
                            <li key={i} className="truncate">
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Key Entities & Topics Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {(dossier.topics || []).map((t, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-[#F7F6F1] px-2 py-0.5 text-[10px] font-medium text-[#285943] border border-[#E4E5DE]"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {t}
                        </span>
                      ))}
                      {(dossier.key_entities || []).slice(0, 3).map((e, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-gray-50 px-2 py-0.5 text-[10px] text-[#777D76] border border-gray-200"
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E4E5DE]/60 flex items-center justify-between text-[11px] text-[#777D76]">
                    <span>
                      {dossier.created_at
                        ? new Date(dossier.created_at * 1000).toLocaleDateString()
                        : 'Indexed'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onAskAboutKnowledge?.(
                          `Summarize findings from "${dossier.filename}": ${dossier.executive_summary}`
                        )
                      }
                      className="flex items-center gap-1 text-[#285943] hover:underline"
                    >
                      <span>Explore Insights</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
