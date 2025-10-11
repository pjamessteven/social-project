import Link from "next/link";
import { Badge } from "../components/ui/badge";
import UsersFilters from "../components/UsersFilters";
import UsersPagination from "../components/UsersPagination";

interface User {
  username: string;
  activeSince: string;
  sex: "m" | "f";
  experienceSummary: string | null;
  tags: string[];
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface UsersPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

const availableTags = [
  "trauma",
  "autism",
  "ocd",
  "puberty discomfort",
  "top surgery",
  "bottom surgery",
  "internalised homophobia",
  "autogynephilia (AGP)",
  "started as non-binary",
  "escapism",
  "depression",
  "low self-esteem",
  "anxiety",
  "eating disorder",
  "influenced online",
  "influenced by friends",
  "trans kid",
  "hormone therapy",
  "puberty blockers",
  "health complications",
  "infertility",
  "body dysmorphia",
  "retransition",
  "social transition only",
  "suspicious account"
];

async function fetchUsers(searchParams: { [key: string]: string | string[] | undefined }) {
  const params = new URLSearchParams();
  
  const page = typeof searchParams.page === 'string' ? searchParams.page : '1';
  params.set('page', page);
  params.set('limit', '20');
  
  if (searchParams.sex && typeof searchParams.sex === 'string') {
    params.set('sex', searchParams.sex);
  }
  
  if (searchParams.tag && typeof searchParams.tag === 'string') {
    params.set('tag', searchParams.tag);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/users?${params}`, {
    cache: 'no-store'
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }
  
  return response.json() as Promise<UsersResponse>;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const data = await fetchUsers(searchParams);
  const { users, pagination } = data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Detrans Users</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Browse summarised experiences from most active members in the /r/detrans Reddit community, the largest open collection of detransition stories on the internet.  
        </p>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                Each user has been analysed for signs of bot generated or inauthentic content. Any account that does not appear to be a genuine de-transitioner is tagged 'suspicious account'.
          </p>
                          <p className="text-gray-600 dark:text-gray-400 mt-2">
               Accounts that have left fewer than five comments have been ommitted from analysis.
          </p>
      </div>

      <UsersFilters availableTags={availableTags} />

      {/* Results count */}
      <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        Showing {users.length} of {pagination.total} users
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found matching your filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Link
              key={user.username}
              href={`/users/${encodeURIComponent(user.username)}`}
              className="block border rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{user.username}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Active on /r/detrans since {formatDate(user.activeSince)}
                  </span>
                </div>
              </div>
              
              {user.experienceSummary && (
                <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
                  {user.experienceSummary}
                </p>
              )}
              
              {user.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {user.sex === "f" ? "Female" : "Male"}
                  </Badge>
                  {user.tags.slice(0, 5).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {user.tags.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{user.tags.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <UsersPagination pagination={pagination} />
    </div>
  );
}
