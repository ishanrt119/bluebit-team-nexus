export type MetricType = 'commits' | 'contributors' | 'churn' | 'refactors';

export interface MetricInsight {
  status: string;
  color: string;
  explanation: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export function getMetricInsight(type: MetricType, value: number): MetricInsight {
  switch (type) {
    case 'commits':
      if (value < 20) {
        return {
          status: 'Just Starting Out',
          color: 'blue',
          explanation: 'This project is brand new and just getting its first few pieces of code.',
          textColor: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      } else if (value <= 100) {
        return {
          status: 'Growing Fast',
          color: 'green',
          explanation: 'The project is being worked on regularly and is growing steadily.',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      } else {
        return {
          status: 'Well Established',
          color: 'purple',
          explanation: 'This project has a long history and a lot of work put into it.',
          textColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      }

    case 'contributors':
      if (value === 1) {
        return {
          status: 'Solo Builder',
          color: 'blue',
          explanation: 'One person is doing all the work on this project.',
          textColor: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      } else if (value <= 5) {
        return {
          status: 'Small Group',
          color: 'green',
          explanation: 'A few friends or teammates are working on this together.',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      } else {
        return {
          status: 'Big Community',
          color: 'purple',
          explanation: 'Lots of people are helping out and sharing their ideas.',
          textColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          borderColor: 'border-purple-500/20',
        };
      }

    case 'churn':
      if (value < 10) {
        return {
          status: 'Very Stable',
          color: 'green',
          explanation: 'The code stays mostly the same, which means it is very solid.',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      } else if (value <= 25) {
        return {
          status: 'Slowly Changing',
          color: 'yellow',
          explanation: 'The project is being updated, but not too much at once.',
          textColor: 'text-yellow-400',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
        };
      } else if (value <= 40) {
        return {
          status: 'Lots of Updates',
          color: 'orange',
          explanation: 'Many parts of the code are being changed or replaced.',
          textColor: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
        };
      } else {
        return {
          status: 'Changing Very Fast',
          color: 'red',
          explanation: 'The code is being rewritten a lot, which might mean big changes are happening.',
          textColor: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
        };
      }

    case 'refactors':
      if (value === 0) {
        return {
          status: 'No Big Cleanups',
          color: 'gray',
          explanation: 'The code structure has stayed the same since it started.',
          textColor: 'text-zinc-400',
          bgColor: 'bg-zinc-500/10',
          borderColor: 'border-zinc-500/20',
        };
      } else if (value <= 3) {
        return {
          status: 'Tidying Up',
          color: 'green',
          explanation: 'The developers are spending some time cleaning up the code.',
          textColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/20',
        };
      } else {
        return {
          status: 'Active Cleaning',
          color: 'blue',
          explanation: 'The project is being polished and made better every day.',
          textColor: 'text-blue-400',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/20',
        };
      }

    default:
      return {
        status: 'Unknown',
        color: 'gray',
        explanation: 'No data available.',
        textColor: 'text-zinc-400',
        bgColor: 'bg-zinc-500/10',
        borderColor: 'border-zinc-500/20',
      };
  }
}
