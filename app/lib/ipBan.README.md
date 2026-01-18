# IP Ban Utility

A comprehensive utility for managing IP-based bans in the social-project application.

## Overview

The IP ban utility provides functionality to:
- Check if an IP address is banned
- Extract IP addresses from HTTP requests
- Ban and unban IP addresses
- Retrieve lists of banned IPs
- Automatically check bans in route handlers

## Installation

The utility is already integrated into the project. Import the functions you need from `@/app/lib/ipBan`.

## Core Functions

### `isIpBanned(ipAddress: string): Promise<boolean>`
Checks if a specific IP address is banned.

```typescript
import { isIpBanned } from "@/app/lib/ipBan";

const isBanned = await isIpBanned("192.168.1.100");
console.log(`IP is banned: ${isBanned}`);
```

### `getIpFromRequest(req: NextRequest): string`
Extracts the client IP address from a Next.js request object. Checks multiple headers in order:
1. `x-forwarded-for` (common in proxy setups)
2. `x-real-ip`
3. `forwarded` (standard format)
4. `cf-connecting-ip` (Cloudflare)
5. `true-client-ip` (Akamai and other proxies)

Returns `"unknown"` if no IP can be determined.

```typescript
import { getIpFromRequest } from "@/app/lib/ipBan";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const ipAddress = getIpFromRequest(req);
  console.log(`Client IP: ${ipAddress}`);
}
```

### `checkIpBan(req: NextRequest): Promise<void>`
Checks if the request comes from a banned IP and throws an error if banned.

```typescript
import { checkIpBan } from "@/app/lib/ipBan";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    await checkIpBan(req);
    // Proceed with request processing
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }
}
```

### `banIp(ipAddress: string, reason?: string, bannedBy?: string): Promise<void>`
Adds an IP address to the ban list.

```typescript
import { banIp } from "@/app/lib/ipBan";

await banIp(
  "10.0.0.1",
  "Excessive spam requests",
  "admin_user"
);
```

### `unbanIp(ipAddress: string): Promise<void>`
Removes an IP address from the ban list.

```typescript
import { unbanIp } from "@/app/lib/ipBan";

await unbanIp("10.0.0.1");
```

### `getBannedIps(): Promise<Array<{ipAddress: string, reason: string | null, bannedBy: string | null, createdAt: Date}>>`
Retrieves all banned IPs with their details.

```typescript
import { getBannedIps } from "@/app/lib/ipBan";

const bannedIps = await getBannedIps();
console.log(`Total banned IPs: ${bannedIps.length}`);
```

## Database Schema

The utility uses the `banned_users` table with the following schema:

```sql
CREATE TABLE banned_users (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  reason TEXT,
  banned_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_banned_users_ip_address ON banned_users(ip_address);
CREATE INDEX idx_banned_users_created ON banned_users(created_at);
```

## Integration with Existing Routes

The following routes have been updated to include IP ban checking:

### Chat Routes
- `app/api/chat/route.ts` - Main chat endpoint
- `app/api/chat/[uuid]/route.ts` - Individual chat conversations
- `app/api/chat/conversations/route.ts` - Conversations list

### Research Routes
- `app/api/research/affirm/route.ts` - Affirm research chat
- `app/api/research/detrans/route.ts` - Detrans research chat

### Authentication Routes
- `app/api/auth/login/route.ts` - User login
- `app/api/auth/register/route.ts` - User registration

### Other Routes
- `app/api/contact/route.ts` - Contact form submissions
- `app/api/videos/submit/route.ts` - Video submissions

## Error Handling

The utility includes comprehensive error handling:
- Database errors are caught and logged
- Invalid IP addresses are rejected
- If ban checking fails, requests are allowed (fail-open for availability)
- Clear error messages are provided for banned IPs

## Security Considerations

1. **IP Extraction**: The utility checks multiple headers to accurately determine the client IP behind proxies and CDNs.

2. **Fail-Open Design**: If the database is unavailable, ban checks fail open (allow requests) to avoid denying service to legitimate users.

3. **Input Validation**: IP addresses are validated before being stored or checked.

4. **Logging**: All ban/unban operations are logged for audit purposes.

## Example Usage in Route Handlers

### Basic Integration
```typescript
import { checkIpBan } from "@/app/lib/ipBan";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    // Check IP ban status
    await checkIpBan(req);
    
    // Process request if not banned
    const data = await req.json();
    // ... process request ...
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.message.includes("Access denied")) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Advanced: Banning Users from Conversation View
The chat conversation route (`app/api/chat/[uuid]/route.ts`) includes a PATCH endpoint that allows admins to ban users based on their IP address from a specific conversation.

## Testing

An example file `ipBan.example.ts` is available in the same directory demonstrating all functionality. Run it with:

```bash
npx tsx app/lib/ipBan.example.ts
```

## Related Utilities

- `getIp.ts`: Simpler IP extraction utility (less comprehensive than `getIpFromRequest`)
- `rateLimit.ts`: Rate limiting functionality (complements IP bans)
- `isBot.ts`: Bot detection (can be used alongside IP bans)

## Maintenance

### Adding New Banned IPs
Use the admin interface or directly insert into the `banned_users` table:

```sql
INSERT INTO banned_users (ip_address, reason, banned_by)
VALUES ('192.168.1.100', 'Spam bot', 'admin');
```

### Removing Banned IPs
```sql
DELETE FROM banned_users WHERE ip_address = '192.168.1.100';
```

### Monitoring
Check the application logs for ban-related operations and monitor the `banned_users` table size.

## Troubleshooting

### IP Not Being Detected
If `getIpFromRequest` returns "unknown":
1. Check if the request is coming through a proxy/CDN
2. Verify proxy headers are being passed correctly
3. Check local development environment (may not have proxy headers)

### Ban Check Not Working
1. Verify database connection
2. Check `banned_users` table exists and has correct schema
3. Verify IP address format in the database matches what's being checked

### False Positives
If legitimate users are being banned:
1. Check for shared IP addresses (corporate networks, universities)
2. Consider using rate limiting instead of outright bans for less severe offenses
3. Implement an appeal process for banned users

## Future Enhancements

Potential improvements:
1. Temporary bans with expiration dates
2. Ban by IP range/CIDR
3. Integration with abuse detection systems
4. Automated ban escalation based on offense frequency
5. User appeal system for bans