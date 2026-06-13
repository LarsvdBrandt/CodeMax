"use client";
import TeamContent from "./TeamContent";

interface Props {
  projectId: string;
  projectName: string;
  myRole: string;
  onClose: () => void;
}

export default function TeamModal({ projectId, projectName, myRole, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-lg bg-[#0d0d0d] border border-[#1e1e1e] rounded-[16px] overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e]">
            <div>
              <div className="text-sm font-semibold text-white">Team Members</div>
              <div className="text-xs text-[#555] mt-0.5">{projectName}</div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-[8px] text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto">
            <TeamContent projectId={projectId} projectName={projectName} myRole={myRole} />
          </div>
        </div>
      </div>
    </>
  );
}
