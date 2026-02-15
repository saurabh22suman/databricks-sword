import Link from "next/link"

/**
 * Site-wide footer with navigation links and branding.
 * Cyberpunk/anime themed footer matching the new design.
 */
export function Footer(): React.ReactElement {
  return (
    <footer className="bg-anime-900 border-t border-white/5 py-12 relative z-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <span className="text-2xl font-black italic tracking-tighter text-white">
              DATABRICKS <span className="text-anime-accent">SWORD</span>
            </span>
            <p className="mt-4 text-gray-400 max-w-xs text-sm">
              Next-Gen Lakehouse Training Simulation.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-xs border-l-2 border-anime-cyan pl-3">Sector 01</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link href="/missions" className="hover:text-anime-cyan hover:pl-2 transition-all">
                  Missions
                </Link>
              </li>
              <li>
                <Link href="/challenges" className="hover:text-anime-cyan hover:pl-2 transition-all">
                  Challenges
                </Link>
              </li>
              <li>
                <Link href="/intel" className="hover:text-anime-cyan hover:pl-2 transition-all">
                  Intel
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-anime-cyan hover:pl-2 transition-all">
                  Logs
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-xs border-l-2 border-anime-accent pl-3">System</h4>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>
                <Link href="/updates" className="hover:text-anime-accent hover:pl-2 transition-all">
                  Updates
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="hover:text-anime-accent hover:pl-2 transition-all">
                  Feedback
                </Link>
              </li>
              <li>
                <a
                  href="https://buymeacoffee.com/saurabh.suman"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-anime-accent hover:pl-2 transition-all"
                >
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center pt-8 border-t border-white/5 text-gray-600 text-xs uppercase tracking-widest">
          <p>&copy; {new Date().getFullYear()} DATABRICKS SWORD PROJECT. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </footer>
  )
}
