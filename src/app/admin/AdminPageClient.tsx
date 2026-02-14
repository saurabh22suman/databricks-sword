"use client"

import { Button } from "@/components/ui/Button"
import { useEffect, useState } from "react"

type Tab = "blogs" | "faq" | "import"

type BlogPost = {
  id: string
  slug: string
  title: string
  description: string
  content: string
  category: string
  tags: string[]
  publishedAt: string
  featured: boolean
  status: "draft" | "published" | "archived"
}

type FAQItem = {
  id: string
  question: string
  answer: string
  category: string
  codeExample?: string
  keyPoints?: string[]
}

type BlogFormData = {
  slug: string
  title: string
  description: string
  content: string
  category: string
  tags: string
  featured: boolean
  status: "draft" | "published" | "archived"
}

type FAQFormData = {
  question: string
  answer: string
  category: string
  codeExample: string
  keyPoints: string
}

const emptyBlogForm: BlogFormData = {
  slug: "",
  title: "",
  description: "",
  content: "",
  category: "tutorials",
  tags: "",
  featured: false,
  status: "draft",
}

const emptyFaqForm: FAQFormData = {
  question: "",
  answer: "",
  category: "general",
  codeExample: "",
  keyPoints: "",
}

/**
 * Admin panel client component.
 * Handles authentication and content management.
 */
export default function AdminPageClient(): React.ReactElement {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("blogs")
  const [blogs, setBlogs] = useState<BlogPost[]>([])
  const [faqs, setFaqs] = useState<FAQItem[]>([])
  const [importUrl, setImportUrl] = useState("")
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    preview?: string
  } | null>(null)

  // Modal states
  const [showBlogModal, setShowBlogModal] = useState(false)
  const [showFaqModal, setShowFaqModal] = useState(false)
  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null)
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null)
  const [blogForm, setBlogForm] = useState<BlogFormData>(emptyBlogForm)
  const [faqForm, setFaqForm] = useState<FAQFormData>(emptyFaqForm)
  const [saving, setSaving] = useState(false)

  // Check auth status on mount
  useEffect(() => {
    checkAuth()
  }, [])

  // Load content when authenticated
  useEffect(() => {
    if (authenticated) {
      loadContent()
    }
  }, [authenticated])

  const checkAuth = async (): Promise<void> => {
    try {
      const res = await fetch("/api/admin/auth")
      const data = await res.json()
      setAuthenticated(data.authenticated)
    } catch {
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        setAuthenticated(true)
        setPassword("")
      } else {
        const data = await res.json()
        setError(data.error || "Login failed")
      }
    } catch {
      setError("Network error")
    }
  }

  const handleLogout = async (): Promise<void> => {
    await fetch("/api/admin/auth", { method: "DELETE" })
    setAuthenticated(false)
  }

  const loadContent = async (): Promise<void> => {
    try {
      const [blogsRes, faqsRes] = await Promise.all([
        fetch("/api/admin/blog"),
        fetch("/api/admin/faq"),
      ])

      if (blogsRes.ok) {
        const data = await blogsRes.json()
        setBlogs(data.blogs || [])
      }

      if (faqsRes.ok) {
        const data = await faqsRes.json()
        setFaqs(data.faqs || [])
      }
    } catch {
      console.error("Failed to load content")
    }
  }

  const handleImport = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setImportLoading(true)
    setImportResult(null)

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl }),
      })

      const data = await res.json()

      if (res.ok) {
        setImportResult({
          success: true,
          message: "Article imported successfully!",
          preview: data.preview,
        })
        setImportUrl("")
        loadContent()
      } else {
        setImportResult({
          success: false,
          message: data.error || "Import failed",
        })
      }
    } catch {
      setImportResult({
        success: false,
        message: "Network error during import",
      })
    } finally {
      setImportLoading(false)
    }
  }

  // Blog modal handlers
  const openNewBlog = (): void => {
    setEditingBlog(null)
    setBlogForm(emptyBlogForm)
    setShowBlogModal(true)
  }

  const openEditBlog = (blog: BlogPost): void => {
    setEditingBlog(blog)
    setBlogForm({
      slug: blog.slug,
      title: blog.title,
      description: blog.description,
      content: blog.content || "",
      category: blog.category,
      tags: blog.tags?.join(", ") || "",
      featured: blog.featured,
      status: blog.status,
    })
    setShowBlogModal(true)
  }

  const closeBlogModal = (): void => {
    setShowBlogModal(false)
    setEditingBlog(null)
    setBlogForm(emptyBlogForm)
  }

  const handleSaveBlog = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        slug: blogForm.slug,
        title: blogForm.title,
        description: blogForm.description,
        content: blogForm.content,
        category: blogForm.category,
        tags: blogForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        featured: blogForm.featured,
        status: blogForm.status,
      }

      const res = editingBlog
        ? await fetch("/api/admin/blog", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingBlog.id, ...payload }),
          })
        : await fetch("/api/admin/blog", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        closeBlogModal()
        loadContent()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save")
      }
    } catch {
      alert("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBlog = async (blog: BlogPost): Promise<void> => {
    if (!confirm(`Delete blog post "${blog.title}"?`)) return

    try {
      const res = await fetch(`/api/admin/blog?id=${blog.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        loadContent()
      }
    } catch {
      console.error("Failed to delete blog")
    }
  }

  const handleArchiveBlog = async (blog: BlogPost): Promise<void> => {
    const newStatus = blog.status === "archived" ? "published" : "archived"

    try {
      const res = await fetch("/api/admin/blog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blog.id, status: newStatus }),
      })

      if (res.ok) {
        loadContent()
      }
    } catch {
      console.error("Failed to archive blog")
    }
  }

  // FAQ modal handlers
  const openNewFaq = (): void => {
    setEditingFaq(null)
    setFaqForm(emptyFaqForm)
    setShowFaqModal(true)
  }

  const openEditFaq = (faq: FAQItem): void => {
    setEditingFaq(faq)
    setFaqForm({
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      codeExample: faq.codeExample || "",
      keyPoints: faq.keyPoints?.join("\n") || "",
    })
    setShowFaqModal(true)
  }

  const closeFaqModal = (): void => {
    setShowFaqModal(false)
    setEditingFaq(null)
    setFaqForm(emptyFaqForm)
  }

  const handleSaveFaq = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload = {
        question: faqForm.question,
        answer: faqForm.answer,
        category: faqForm.category,
        codeExample: faqForm.codeExample || null,
        keyPoints: faqForm.keyPoints.split("\n").map((p) => p.trim()).filter(Boolean),
      }

      const res = editingFaq
        ? await fetch("/api/admin/faq", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editingFaq.id, ...payload }),
          })
        : await fetch("/api/admin/faq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (res.ok) {
        closeFaqModal()
        loadContent()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to save")
      }
    } catch {
      alert("Network error")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFaq = async (faq: FAQItem): Promise<void> => {
    if (!confirm("Delete this FAQ item?")) return

    try {
      const res = await fetch(`/api/admin/faq?id=${faq.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        loadContent()
      }
    } catch {
      console.error("Failed to delete FAQ")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-anime-950 flex items-center justify-center">
        <div className="text-anime-cyan animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-anime-950 flex items-center justify-center">
        <div className="grain-overlay fixed inset-0 pointer-events-none" />
        <div className="relative z-10 w-full max-w-md p-8">
          <div className="bg-anime-900 border border-anime-700 rounded-lg p-8 shadow-neon-cyan">
            <h1 className="font-heading text-2xl text-anime-cyan uppercase italic tracking-tight mb-6 text-center">
              Admin Access
            </h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-mono text-gray-400 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-anime-950 border border-anime-700 rounded-lg text-white font-mono focus:border-anime-cyan focus:outline-none focus:ring-1 focus:ring-anime-cyan"
                  placeholder="Enter admin password"
                  required
                />
              </div>

              {error && (
                <div className="text-anime-accent text-sm font-mono">
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" className="w-full">
                Login
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-anime-950 pt-20">
      <div className="grain-overlay fixed inset-0 pointer-events-none" />

      <div className="relative z-10 container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-heading text-3xl text-anime-cyan uppercase italic tracking-tight">
            Admin Panel
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-anime-700 pb-4">
          {(["blogs", "faq", "import"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-mono text-sm uppercase tracking-wider rounded-lg transition-colors ${
                activeTab === tab
                  ? "bg-anime-cyan text-anime-950"
                  : "bg-anime-900 text-gray-400 hover:text-white"
              }`}
            >
              {tab === "import" ? "Import URL" : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "blogs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl text-white">
                Blog Posts ({blogs.length})
              </h2>
              <Button
                variant="primary"
                onClick={openNewBlog}
              >
                + New Post
              </Button>
            </div>

            <div className="bg-anime-900 border border-anime-700 rounded-lg overflow-hidden">
              {blogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No blog posts found
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-anime-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-mono text-anime-cyan">
                        Title
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-mono text-anime-cyan">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-mono text-anime-cyan">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-mono text-anime-cyan">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-mono text-anime-cyan">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-anime-700">
                    {blogs.map((blog) => (
                      <tr key={blog.id || blog.slug} className="hover:bg-anime-800/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {blog.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            /{blog.slug}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {blog.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {blog.featured && (
                              <span className="px-2 py-1 text-xs bg-anime-accent/20 text-anime-accent rounded">
                                Featured
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded ${
                              blog.status === "published"
                                ? "bg-anime-green/20 text-anime-green"
                                : blog.status === "archived"
                                ? "bg-gray-700/50 text-gray-400"
                                : "bg-anime-yellow/20 text-anime-yellow"
                            }`}>
                              {blog.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditBlog(blog)}
                              className="px-3 py-1 text-xs bg-anime-700 hover:bg-anime-600 text-white rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleArchiveBlog(blog)}
                              className="px-3 py-1 text-xs bg-anime-purple/20 hover:bg-anime-purple/30 text-anime-purple rounded"
                            >
                              {blog.status === "archived" ? "Restore" : "Archive"}
                            </button>
                            <button
                              onClick={() => handleDeleteBlog(blog)}
                              className="px-3 py-1 text-xs bg-anime-accent/20 hover:bg-anime-accent/30 text-anime-accent rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "faq" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl text-white">
                FAQ Items ({faqs.length})
              </h2>
              <Button
                variant="primary"
                onClick={openNewFaq}
              >
                + New FAQ
              </Button>
            </div>

            <div className="bg-anime-900 border border-anime-700 rounded-lg overflow-hidden">
              {faqs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No FAQ items found
                </div>
              ) : (
                <div className="divide-y divide-anime-700">
                  {faqs.map((faq) => (
                    <div key={faq.id} className="p-4 hover:bg-anime-800/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-xs bg-anime-cyan/20 text-anime-cyan rounded">
                              {faq.category}
                            </span>
                          </div>
                          <div className="font-medium text-white">
                            {faq.question}
                          </div>
                          <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                            {faq.answer}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditFaq(faq)}
                            className="px-3 py-1 text-xs bg-anime-700 hover:bg-anime-600 text-white rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFaq(faq)}
                            className="px-3 py-1 text-xs bg-anime-accent/20 hover:bg-anime-accent/30 text-anime-accent rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="space-y-6">
            <h2 className="font-heading text-xl text-white">
              Import from URL
            </h2>

            <div className="bg-anime-900 border border-anime-700 rounded-lg p-6">
              <p className="text-gray-400 mb-4">
                Import articles from external URLs including Medium, Dev.to, or
                any web page. The content will be converted to MDX format.
              </p>

              <form onSubmit={handleImport} className="space-y-4">
                <div>
                  <label
                    htmlFor="importUrl"
                    className="block text-sm font-mono text-gray-400 mb-2"
                  >
                    Article URL
                  </label>
                  <input
                    id="importUrl"
                    type="url"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="w-full px-4 py-3 bg-anime-950 border border-anime-700 rounded-lg text-white font-mono focus:border-anime-cyan focus:outline-none focus:ring-1 focus:ring-anime-cyan"
                    placeholder="https://medium.com/@author/article-slug"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={importLoading}
                >
                  {importLoading ? "Importing..." : "Import Article"}
                </Button>
              </form>

              {importResult && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    importResult.success
                      ? "bg-anime-green/10 border border-anime-green"
                      : "bg-anime-accent/10 border border-anime-accent"
                  }`}
                >
                  <p
                    className={
                      importResult.success
                        ? "text-anime-green"
                        : "text-anime-accent"
                    }
                  >
                    {importResult.message}
                  </p>
                  {importResult.preview && (
                    <pre className="mt-2 text-xs text-gray-400 overflow-x-auto">
                      {importResult.preview}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="bg-anime-900/50 border border-anime-700 rounded-lg p-4">
              <h3 className="font-mono text-sm text-anime-cyan mb-2">
                Supported Sources:
              </h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Medium articles (medium.com)</li>
                <li>• Dev.to posts (dev.to)</li>
                <li>• Hashnode blogs (hashnode.dev)</li>
                <li>• Any public web page with article content</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Blog Modal */}
      {showBlogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-anime-900 border border-anime-700 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-anime-700 flex items-center justify-between">
              <h2 className="font-heading text-xl text-anime-cyan uppercase">
                {editingBlog ? "Edit Blog Post" : "New Blog Post"}
              </h2>
              <button
                onClick={closeBlogModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveBlog} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={blogForm.slug}
                    onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                    placeholder="my-blog-post"
                    required
                    disabled={!!editingBlog}
                  />
                </div>
                <div>
                  <label className="block text-sm font-mono text-gray-400 mb-2">
                    Category
                  </label>
                  <select
                    value={blogForm.category}
                    onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  >
                    <option value="tutorials">Tutorials</option>
                    <option value="deep-dive">Deep Dive</option>
                    <option value="news">News</option>
                    <option value="tips">Tips</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  placeholder="Blog Post Title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={blogForm.description}
                  onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  placeholder="Short description for SEO"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Content (Markdown) *
                </label>
                <textarea
                  value={blogForm.content}
                  onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none h-64 resize-y"
                  placeholder="# Your Blog Post&#10;&#10;Write your content in Markdown..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  value={blogForm.tags}
                  onChange={(e) => setBlogForm({ ...blogForm, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  placeholder="pyspark, delta-lake, tutorial"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={blogForm.featured}
                    onChange={(e) => setBlogForm({ ...blogForm, featured: e.target.checked })}
                    className="rounded bg-anime-950 border-anime-700"
                  />
                  Featured
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Status:</span>
                  <select
                    value={blogForm.status}
                    onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value as BlogFormData["status"] })}
                    className="px-3 py-1 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-anime-700">
                <Button variant="outline" type="button" onClick={closeBlogModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingBlog ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-anime-900 border border-anime-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-anime-700 flex items-center justify-between">
              <h2 className="font-heading text-xl text-anime-cyan uppercase">
                {editingFaq ? "Edit FAQ" : "New FAQ"}
              </h2>
              <button
                onClick={closeFaqModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Category
                </label>
                <select
                  value={faqForm.category}
                  onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                >
                  <option value="general">General Databricks</option>
                  <option value="delta-lake">Delta Lake</option>
                  <option value="pyspark">PySpark</option>
                  <option value="sql">SQL & Analytics</option>
                  <option value="mlflow">MLflow & MLOps</option>
                  <option value="architecture">Architecture</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Question *
                </label>
                <input
                  type="text"
                  value={faqForm.question}
                  onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none"
                  placeholder="What is...?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Answer *
                </label>
                <textarea
                  value={faqForm.answer}
                  onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none h-32 resize-y"
                  placeholder="Detailed answer..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Code Example (optional)
                </label>
                <textarea
                  value={faqForm.codeExample}
                  onChange={(e) => setFaqForm({ ...faqForm, codeExample: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none h-24 resize-y"
                  placeholder="# PySpark code example"
                />
              </div>

              <div>
                <label className="block text-sm font-mono text-gray-400 mb-2">
                  Key Points (one per line)
                </label>
                <textarea
                  value={faqForm.keyPoints}
                  onChange={(e) => setFaqForm({ ...faqForm, keyPoints: e.target.value })}
                  className="w-full px-3 py-2 bg-anime-950 border border-anime-700 rounded text-white font-mono text-sm focus:border-anime-cyan focus:outline-none h-24 resize-y"
                  placeholder="First key point&#10;Second key point&#10;Third key point"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-anime-700">
                <Button variant="outline" type="button" onClick={closeFaqModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingFaq ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
