import React, { useState, useMemo } from 'react';
import { Users, Calendar, Clock, PieChart as PieIcon, Filter } from 'lucide-react';
import TimelineChart from './charts/TimelineChart';
import DonutChart from './charts/DonutChart';
import HourlyChart from './charts/HourlyChart';
import WeeklyChart from './charts/WeeklyChart';
import MonthlyChart from './charts/MonthlyChart';

const COLORS = ['#10b981', '#38bdf8', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#f97316'];

const ContributorGraph = ({ timeline, contributors }) => {
  const [selectedAuthors, setSelectedAuthors] = useState([]);

  // Map login to avatar for quick lookup
  const avatarMap = useMemo(() => {
    const map = {};
    contributors.forEach(c => {
      map[c.login] = c.avatar;
    });
    return map;
  }, [contributors]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!timeline || timeline.length === 0) return { timeline: [], hourly: [], daily: [], monthly: [], pie: [] };

    const filteredTimeline = selectedAuthors.length > 0 
      ? timeline.filter(c => selectedAuthors.includes(c.login || c.author))
      : timeline;

    // 1. Timeline Data (Commits per day)
    const timelineMap = {};
    filteredTimeline.forEach(commit => {
      const date = new Date(commit.date).toLocaleDateString();
      timelineMap[date] = (timelineMap[date] || 0) + 1;
    });
    const timelineData = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // 2. Hourly Activity
    const hourlyMap = Array(24).fill(0);
    filteredTimeline.forEach(commit => {
      const hour = new Date(commit.date).getHours();
      hourlyMap[hour]++;
    });
    const hourlyData = hourlyMap.map((count, hour) => ({
      hour: `${hour}:00`,
      count
    }));

    // 3. Daily Activity
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyMap = Array(7).fill(0);
    filteredTimeline.forEach(commit => {
      const day = new Date(commit.date).getDay();
      dailyMap[day]++;
    });
    const dailyData = dailyMap.map((count, day) => ({
      day: days[day],
      count
    }));

    // 4. Monthly Activity
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = Array(12).fill(0);
    filteredTimeline.forEach(commit => {
      const month = new Date(commit.date).getMonth();
      monthlyMap[month]++;
    });
    const monthlyData = monthlyMap.map((count, month) => ({
      month: months[month],
      count
    }));

    // 5. Pie Chart Data (Contribution %)
    const authorCommits = {};
    timeline.forEach(commit => {
      const author = commit.login || commit.author;
      authorCommits[author] = (authorCommits[author] || 0) + 1;
    });
    const pieData = Object.entries(authorCommits)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { timeline: timelineData, hourly: hourlyData, daily: dailyData, monthly: monthlyData, pie: pieData };
  }, [timeline, selectedAuthors]);

  const toggleAuthor = (author) => {
    setSelectedAuthors(prev => 
      prev.includes(author) 
        ? prev.filter(a => a !== author) 
        : [...prev, author]
    );
  };

  return (
    <div className="contributor-graph-container fade-in">
      {/* Author Filter */}
      <div className="filter-section">
        <div className="filter-header">
          <Filter className="w-4 h-4 text-emerald-500" />
          <span>Filter by Contributor</span>
        </div>
        <div className="author-chips">
          {chartData.pie.map((author, index) => (
            <button
              key={author.name}
              onClick={() => toggleAuthor(author.name)}
              className={`author-chip ${selectedAuthors.includes(author.name) ? 'active' : ''}`}
              style={{ '--chip-color': COLORS[index % COLORS.length] }}
            >
              {avatarMap[author.name] ? (
                <img src={avatarMap[author.name]} alt={author.name} className="chip-avatar" referrerPolicy="no-referrer" />
              ) : (
                <span className="chip-dot"></span>
              )}
              {author.name}
              <span className="chip-count">{author.value}</span>
            </button>
          ))}
          {selectedAuthors.length > 0 && (
            <button onClick={() => setSelectedAuthors([])} className="clear-filter">
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="charts-grid">
        {/* Main Timeline */}
        <div className="chart-card large">
          <div className="chart-header">
            <Calendar className="chart-icon" />
            <div>
              <h4>Commit Timeline</h4>
              <p>Frequency of code changes over time</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <TimelineChart data={chartData.timeline} />
          </div>
        </div>

        {/* Contribution Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <PieIcon className="chart-icon" />
            <div>
              <h4>Contribution Share</h4>
              <p>Commits per author</p>
            </div>
          </div>
          <div className="chart-wrapper pie-wrapper">
            <DonutChart data={chartData.pie} colors={COLORS} />
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="chart-card">
          <div className="chart-header">
            <Clock className="chart-icon" />
            <div>
              <h4>Hourly Patterns</h4>
              <p>When is the team most active?</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <HourlyChart data={chartData.hourly} />
          </div>
        </div>

        {/* Daily Activity */}
        <div className="chart-card">
          <div className="chart-header">
            <Users className="chart-icon" />
            <div>
              <h4>Weekly Rhythm</h4>
              <p>Activity by day of week</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <WeeklyChart data={chartData.daily} />
          </div>
        </div>

        {/* Monthly Activity */}
        <div className="chart-card">
          <div className="chart-header">
            <Calendar className="chart-icon" />
            <div>
              <h4>Monthly Trends</h4>
              <p>Seasonal activity patterns</p>
            </div>
          </div>
          <div className="chart-wrapper">
            <MonthlyChart data={chartData.monthly} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContributorGraph;
