// Manual channel connection testing endpoint
import { Request, Response, NextFunction } from 'express';
import { testChannelConnection } from './channel-utils';
import type { ChannelConfig } from '@shared/schema';

export async function testChannelConnectionEndpoint(req: Request, res: Response) {
  try {
    const channelData: ChannelConfig = req.body;
    
    console.log('Testing connection for channel:', channelData.type, channelData.name);
    
    const result = await testChannelConnection(channelData);
    
    // Update channel status in storage with detailed error information
    const { getStorage } = await import('./storage');
    const storage = getStorage();
    
    if (channelData.id) {
      await storage.updateChannelConfig(channelData.id, {
        status: result.success ? 'connected' : 'error',
        errorMessage: result.success ? null : result.error,
        lastErrorTime: result.success ? null : new Date().toISOString(),
        lastSync: result.success ? new Date().toISOString() : channelData.lastSync
      });
    }
    
    res.json({
      success: result.success,
      status: result.success ? 'connected' : 'error',
      message: result.success 
        ? `${channelData.type} connection successful`
        : result.error || `Failed to connect to ${channelData.type} service`
    });
  } catch (error: any) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      message: `Connection test failed: ${error.message}`
    });
  }
}