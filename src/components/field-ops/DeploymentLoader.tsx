/**
 * Deployment Loader Component
 * Shows animated loading messages and tips during Field Ops deployment.
 */

"use client"

import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useRef, useState } from "react"

type DeploymentLoaderProps = {
  industry: string
  onComplete?: () => void
  onError?: (error: string) => void
}

/** Deployment status messages shown sequentially */
const DEPLOYMENT_MESSAGES = [
  { text: "Initializing deployment system...", icon: "⚙️", duration: 1200 },
  { text: "Authenticating with Databricks workspace...", icon: "🔐", duration: 1500 },
  { text: "Creating Unity Catalog schemas...", icon: "📁", duration: 2000 },
  { text: "Deploying Bronze layer tables...", icon: "🥉", duration: 1800 },
  { text: "Deploying Silver layer transformations...", icon: "🥈", duration: 2000 },
  { text: "Deploying Gold layer aggregations...", icon: "🥇", duration: 1800 },
  { text: "Uploading sample data files...", icon: "📊", duration: 2500 },
  { text: "Deploying notebook templates...", icon: "📓", duration: 2000 },
  { text: "Configuring validation queries...", icon: "✅", duration: 1200 },
  { text: "Finalizing deployment...", icon: "🚀", duration: 1500 },
]

/** Databricks best practice tips shown during loading */
const DATABRICKS_TIPS = [
  {
    title: "Medallion Architecture",
    tip: "Bronze stores raw data as-is, Silver cleanses and validates, Gold provides business-ready aggregations.",
  },
  {
    title: "Delta Lake ACID",
    tip: "Delta Lake provides ACID transactions, enabling reliable data pipelines and time travel queries.",
  },
  {
    title: "Unity Catalog",
    tip: "Use Unity Catalog for centralized governance, fine-grained access control, and data lineage tracking.",
  },
  {
    title: "Structured Streaming",
    tip: "Structured Streaming provides exactly-once semantics for building reliable real-time pipelines.",
  },
  {
    title: "Optimize Tables",
    tip: "Run OPTIMIZE regularly on Delta tables to compact small files and improve query performance.",
  },
  {
    title: "Z-Ordering",
    tip: "Use Z-ORDER BY on high-cardinality filter columns to dramatically speed up queries.",
  },
  {
    title: "Liquid Clustering",
    tip: "Liquid Clustering automatically optimizes data layout without manual OPTIMIZE commands.",
  },
  {
    title: "Schema Evolution",
    tip: "Delta Lake supports schema evolution—add new columns without breaking existing pipelines.",
  },
  {
    title: "Data Quality",
    tip: "Use Delta Live Tables expectations to enforce data quality rules at ingestion time.",
  },
  {
    title: "Feature Store",
    tip: "Databricks Feature Store ensures consistent features across training and inference.",
  },
]

export function DeploymentLoader({
  industry,
  onComplete,
}: DeploymentLoaderProps): React.ReactElement {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [completedMessages, setCompletedMessages] = useState<number[]>([])
  const [currentTipIndex, setCurrentTipIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [targetProgress, setTargetProgress] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Lock body scroll when mounted (fullscreen overlay)
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  // Cycle through deployment messages
  useEffect(() => {
    if (currentMessageIndex >= DEPLOYMENT_MESSAGES.length) {
      // All messages complete
      setTimeout(() => {
        onComplete?.()
      }, 800)
      return
    }

    const message = DEPLOYMENT_MESSAGES[currentMessageIndex]
    
    // Update target progress immediately for smooth animation
    setTargetProgress(((currentMessageIndex + 1) / DEPLOYMENT_MESSAGES.length) * 100)
    
    // Mark as completed after duration
    const timer = setTimeout(() => {
      setCompletedMessages((prev) => [...prev, currentMessageIndex])
      setCurrentMessageIndex((prev) => prev + 1)
    }, message.duration)

    return () => clearTimeout(timer)
  }, [currentMessageIndex, onComplete])

  // Auto-scroll the messages container to keep current step visible
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [currentMessageIndex, completedMessages])

  // Smooth progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const diff = targetProgress - prev
        if (Math.abs(diff) < 0.5) return targetProgress
        return prev + diff * 0.08
      })
    }, 16)
    return () => clearInterval(interval)
  }, [targetProgress])

  // Rotate tips every 5 seconds
  useEffect(() => {
    const tipTimer = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % DATABRICKS_TIPS.length)
    }, 5000)

    return () => clearInterval(tipTimer)
  }, [])

  const currentTip = DATABRICKS_TIPS[currentTipIndex]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-anime-950 z-50 flex items-center justify-center overflow-hidden"
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 cyber-grid opacity-20" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-anime-cyan rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              opacity: 0.3,
            }}
            animate={{
              y: [null, -100],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative max-w-2xl w-full mx-4">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="text-6xl mb-4 inline-block"
          >
            🚀
          </motion.div>
          <h1 className="font-heading text-3xl text-anime-cyan mb-2">
            Deploying Mission
          </h1>
          <p className="text-anime-300">
            Setting up your <span className="text-anime-cyan font-medium">{industry}</span> environment...
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <div className="h-3 bg-anime-900 rounded-full overflow-hidden border border-anime-700 shadow-inner">
            <motion.div
              className="h-full rounded-full relative"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #00ffff 0%, #00ff88 50%, #ffcc00 100%)",
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </motion.div>
          </div>
          <p className="text-anime-400 text-sm mt-2 text-center">
            <span className="text-anime-cyan font-mono">{Math.round(progress)}%</span> complete
          </p>
        </motion.div>

        {/* Deployment Messages */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="cut-corner bg-anime-900/80 backdrop-blur-sm border border-anime-700 p-6 mb-6 shadow-neon-cyan/20"
        >
          <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-anime-700">
            <AnimatePresence mode="popLayout">
              {DEPLOYMENT_MESSAGES.slice(0, currentMessageIndex + 1).map((message, index) => {
                const isCompleted = completedMessages.includes(index)
                const isCurrent = index === currentMessageIndex && !isCompleted

                return (
                  <motion.div
                    key={index}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                      "flex items-center gap-3 py-2 px-3 rounded-lg transition-colors duration-300",
                      isCurrent && "bg-anime-800/50"
                    )}
                  >
                    <motion.span
                      className="text-xl w-8 text-center"
                      initial={isCompleted ? { scale: 1.5 } : {}}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {isCompleted ? (
                        <span className="text-anime-green">✓</span>
                      ) : (
                        message.icon
                      )}
                    </motion.span>
                    <span
                      className={cn(
                        "text-sm flex-1",
                        isCompleted ? "text-anime-500" : "text-anime-100"
                      )}
                    >
                      {message.text}
                    </span>
                    {isCurrent && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-anime-cyan opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-anime-cyan" />
                        </span>
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
              {/* Scroll anchor — always at the bottom of the messages list */}
              <div ref={messagesEndRef} />
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Tips Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="cut-corner bg-anime-800/30 backdrop-blur-sm border border-anime-700/50 p-6"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-4"
            >
              <span className="text-2xl">💡</span>
              <div>
                <h3 className="font-heading text-anime-cyan text-sm mb-1">
                  {currentTip.title}
                </h3>
                <p className="text-anime-300 text-sm leading-relaxed">
                  {currentTip.tip}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Tip progress dots */}
          <div className="flex justify-center gap-1.5 mt-4">
            {DATABRICKS_TIPS.map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                  i === currentTipIndex ? "bg-anime-cyan" : "bg-anime-700"
                )}
                animate={i === currentTipIndex ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>

        {/* Scoring Tips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-center"
        >
          <p className="text-anime-500 text-xs">
            💎 <span className="text-anime-300">Pro Tip:</span> Complete all objectives quickly for bonus XP. 
            Use <code className="text-anime-cyan bg-anime-900 px-1 rounded">EXPLAIN</code> to understand query plans before optimizing.
          </p>
        </motion.div>
      </div>
    </motion.div>
  )
}
