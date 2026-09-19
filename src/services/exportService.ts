import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

// Export data to a JSON file and share it
export const exportDataToJson = async (data: string): Promise<void> => {
  try {
    // Create filename with current date
    const fileName = `sleep-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
    const file = new File(Paths.cache, fileName);
    
    // Write data to file
    file.write(data);
    
    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
      // Share the file
      await Sharing.shareAsync(file.uri);
    } else {
      console.log('Sharing is not available on this device');
      // Could implement alternative export method here
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
};

// Export data to CSV format
export const exportDataToCsv = async (
  dailySummaries: any[],
  activityRecords: any[]
): Promise<void> => {
  try {
    // Create CSV content for daily summaries
    let csvContent = 'Date,Total Sleep Minutes,Sleep Periods\n';
    
    dailySummaries.forEach(summary => {
      const sleepPeriodsStr = summary.sleepPeriods
        .map((period: any) => 
          `${format(period.start, 'HH:mm')}-${format(period.end, 'HH:mm')}`
        )
        .join('; ');
      
      csvContent += `${summary.date},${Math.round(summary.totalSleepMinutes)},"${sleepPeriodsStr}"\n`;
    });
    
    // Create filename with current date
    const fileName = `sleep-data-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    const file = new File(Paths.cache, fileName);
    
    // Write data to file
    file.write(csvContent);
    
    // Check if sharing is available
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
      // Share the file
      await Sharing.shareAsync(file.uri);
    } else {
      console.log('Sharing is not available on this device');
      // Could implement alternative export method here
    }
  } catch (error) {
    console.error('Error exporting data to CSV:', error);
    throw error;
  }
};
