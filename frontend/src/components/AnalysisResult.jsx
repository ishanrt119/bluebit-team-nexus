import React from 'react';

const AnalysisResult = ({ data }) => {
  if (!data) return null;

  return (
    <div className="mt-12 w-full max-w-4xl mx-auto animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <p className="text-gray-400 text-sm mb-1">Total Commits</p>
          <p className="text-3xl font-bold text-white">{data.totalCommits}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <p className="text-gray-400 text-sm mb-1">Total Authors</p>
          <p className="text-3xl font-bold text-white">{data.authors.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <p className="text-gray-400 text-sm mb-1">Latest Commit</p>
          <p className="text-lg font-medium text-white truncate">
            {data.timeline[0]?.message || 'N/A'}
          </p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-bottom border-white/10">
          <h3 className="text-xl font-bold text-white">Commit Timeline</h3>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 sticky top-0">
              <tr>
                <th className="p-4 text-gray-400 font-medium text-sm">Author</th>
                <th className="p-4 text-gray-400 font-medium text-sm">Message</th>
                <th className="p-4 text-gray-400 font-medium text-sm">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.timeline.slice(0, 50).map((commit, i) => (
                <tr key={i} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4 text-white text-sm">{commit.author}</td>
                  <td className="p-4 text-gray-300 text-sm">{commit.message}</td>
                  <td className="p-4 text-gray-400 text-xs">
                    {new Date(commit.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.timeline.length > 50 && (
            <div className="p-4 text-center text-gray-500 text-sm border-t border-white/5">
              Showing first 50 commits
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;
