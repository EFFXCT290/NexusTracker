import React, { useEffect, useState, useContext } from "react";
import getConfig from "next/config";
import jwt from "jsonwebtoken";
import { withAuthServerSideProps } from "../utils/withAuth";
import LocaleContext from "../utils/LocaleContext";
import Text from "../components/Text";
import Button from "../components/Button";
import Box from "../components/Box";
import Input from "../components/Input";
import styled from "styled-components";
import css from "@styled-system/css";
import { useRouter } from "next/router";
import { NotificationContext } from "../components/Notifications";
import Link from "next/link";
// ADD LAST SEEN FEATURE
import moment from "moment";
import "moment-timezone";
// End of Last Seen Feature
// ADD PROTECT TORRENT FEATURE
import { Lock } from "@styled-icons/boxicons-regular/Lock";
import ProtectTorrentModal from "../components/ProtectTorrentModal";
// End of Protect Torrent Feature

// Styled components for the admin panel
const StyledTable = styled.table(() =>
  css({
    width: "100%",
    borderCollapse: "collapse",
    bg: "sidebar",
    borderRadius: "4px",
    overflow: "hidden",
  })
);

const StyledTh = styled.th(() =>
  css({
    textAlign: "left",
    py: 3,
    px: 4,
    borderBottom: "1px solid",
    borderColor: "border",
    bg: "sidebar",
    color: "text",
    fontWeight: "600",
  })
);

const StyledTd = styled.td(() =>
  css({
    py: 3,
    px: 4,
    borderBottom: "1px solid",
    borderColor: "border",
  })
);

const StyledTr = styled.tr(() =>
  css({
    "&:hover": {
      bg: "border",
    },
  })
);

const SearchInput = styled(Input)(() =>
  css({
    bg: "sidebar",
    color: "text",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "4px",
    py: 2,
    px: 3,
    width: "100%",
    maxWidth: "500px",
  })
);

const PaginationButton = styled(Button)(() =>
  css({
    py: 1,
    px: 3,
    mx: 1,
    bg: "sidebar",
    color: "text",
    border: "1px solid",
    borderColor: "border",
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  })
);

const DeleteButton = styled(Button)(() =>
  css({
    bg: "red.500",
    color: "white",
    "&:hover": {
      bg: "red.600",
    },
  })
);

const TabButton = styled(Button)(({ isActive }) =>
  css({
    py: 2,
    px: 4,
    mx: 1,
    mb: 4,
    bg: isActive ? "primary" : "sidebar",
    color: "text",
    border: "1px solid",
    borderColor: "border",
    borderBottom: isActive ? "3px solid" : "1px solid",
    borderBottomColor: isActive ? "primary" : "border",
    borderRadius: "4px 4px 0 0",
    fontWeight: isActive ? "bold" : "normal",
  })
);

const AdminPanel = ({ token, userRole }) => {
  const { getLocaleString } = useContext(LocaleContext);
  const { addNotification } = useContext(NotificationContext);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('users'); // Default tab
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [viewerTimezone, setViewerTimezone] = useState("UTC");
  // ADD PROTECT TORRENT FEATURE
  const [protectedTorrents, setProtectedTorrents] = useState([]);
  const [unprotectedTorrents, setUnprotectedTorrents] = useState([]);
  const [showProtectModal, setShowProtectModal] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState(null);
  const [protectedLogs, setProtectedLogs] = useState({});
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState('desc');
  // End of Protect Torrent Feature
  const router = useRouter();
  const { publicRuntimeConfig: { SQ_DEFAULT_TIMEZONE } } = getConfig();
  // ADD PROTECT TORRENT FEATURE
  const { publicRuntimeConfig: { SQ_ENABLE_PROTECTED_TORRENTS = false } } = getConfig();
  // End of Protect Torrent Feature

  // Fetch current admin's timezone on mount
  useEffect(() => {
    const fetchViewer = async () => {
      try {
        const res = await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/user/${router.query?.admin || 'admin'}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const viewer = await res.json();
          setViewerTimezone(viewer.timezone || SQ_DEFAULT_TIMEZONE || "UTC");
        } else {
          setViewerTimezone(SQ_DEFAULT_TIMEZONE || "UTC");
        }
      } catch {
        setViewerTimezone(SQ_DEFAULT_TIMEZONE || "UTC");
      }
    };
    fetchViewer();
  }, [token, router.query, SQ_DEFAULT_TIMEZONE]);

  // Fetch users with pagination, search, and sorting
  const fetchUsers = async (page = 0, searchTerm = search, sortField = sortBy, order = sortOrder) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: pagination.limit,
        sortBy: sortField,
        sortOrder: order,
      });
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      const res = await fetch(
        `${getConfig().publicRuntimeConfig.SQ_API_URL}/users?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      setUsers(data.users || []);
      setPagination(data.pagination || pagination);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  };

  // Fetch stats data
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      const res = await fetch(
        `${getConfig().publicRuntimeConfig.SQ_API_URL}/admin/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!res.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const data = await res.json();
      setStats(data);
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setReports(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setLoading(false);
    }
  };

  // Fetch protected torrents (now fetches all torrents for separation)
  const fetchProtectedTorrents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/torrent/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProtectedTorrents(data.filter(t => t.isProtected));
        setUnprotectedTorrents(data.filter(t => !t.isProtected));
      } else {
        console.error("Error fetching torrents:", res.status);
      }
    } catch (error) {
      console.error("Error fetching torrents:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle editing protected torrent
  const handleEditProtectedTorrent = (torrent) => {
    setSelectedTorrent(torrent);
    setShowProtectModal(true);
  };

  // Handle protection update
  const handleProtectionUpdate = (settings) => {
    if (settings.shouldRefetch) {
      fetchProtectedTorrents();
    }
    // Optimistically update local state for instant UI feedback
    if (selectedTorrent) {
      if (settings.isProtected) {
        // Move to protected
        setProtectedTorrents((prev) => [
          { ...selectedTorrent, isProtected: true },
          ...prev.filter(t => t.infoHash !== selectedTorrent.infoHash)
        ]);
        setUnprotectedTorrents((prev) => prev.filter(t => t.infoHash !== selectedTorrent.infoHash));
        addNotification("success", getLocaleString("protectTorrentSuccess"));
      } else {
        // Move to unprotected
        setUnprotectedTorrents((prev) => [
          { ...selectedTorrent, isProtected: false },
          ...prev.filter(t => t.infoHash !== selectedTorrent.infoHash)
        ]);
        setProtectedTorrents((prev) => prev.filter(t => t.infoHash !== selectedTorrent.infoHash));
        addNotification("success", getLocaleString("protectTorrentRemoved"));
      }
    }
  };

  // Fetch logs for a given torrent
  const fetchProtectedLogs = async (infoHash) => {
    try {
      const res = await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/protect-torrent/logs/${infoHash}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProtectedLogs((prev) => ({ ...prev, [infoHash]: data.logs || [] }));
      }
    } catch (e) {}
  };
  // End of Protect Torrent Feature

  useEffect(() => {
    // Initial data fetch based on active tab
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'stats') {
      fetchStats();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
    // ADD PROTECT TORRENT FEATURE
    else if (activeTab === 'protected-torrents' && SQ_ENABLE_PROTECTED_TORRENTS) {
      fetchProtectedTorrents();
    }
    // End of Protect Torrent Feature
  }, [token, activeTab]);

  // {*/ Add Protect Torrent Feature/*}
  useEffect(() => {
    if (activeTab === 'protected-torrents' && SQ_ENABLE_PROTECTED_TORRENTS) {
      protectedTorrents.forEach(torrent => {
        fetchProtectedLogs(torrent.infoHash);
      });
    }
    // eslint-disable-next-line
  }, [protectedTorrents, activeTab, SQ_ENABLE_PROTECTED_TORRENTS]);
  // {*/End Protect Torrent Feature/*}

  const handleBanUser = async (user) => {
    try {
      // Determine whether to ban or unban based on current status
      const endpoint = user.banned ? 'unban' : 'ban';
      
      await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/user/${endpoint}/${user.username}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Refresh the user list
      fetchUsers(pagination.page);
    } catch (error) {
      console.error(`Error ${user.banned ? 'unbanning' : 'banning'} user:`, error);
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      if (window.confirm(getLocaleString("adminDeleteUserConfirm").replace("{username}", user.username))) {
        await fetch(`${getConfig().publicRuntimeConfig.SQ_API_URL}/user/${user.username}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        // Use fetchUsers here too for consistency
        fetchUsers(pagination.page);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert(getLocaleString("adminDeleteUserFailed"));
    }
  };
  
  // Handle sorting
  const handleSort = (field) => {
    let order = 'asc';
    if (sortBy === field && sortOrder === 'asc') {
      order = 'desc';
    }
    setSortBy(field);
    setSortOrder(order);
    fetchUsers(0, search, field, order);
  };
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < pagination.pages) {
      fetchUsers(newPage, search, sortBy, sortOrder);
    }
  };
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(0, search, sortBy, sortOrder);
  };
  
  // Clear search
  const clearSearch = () => {
    setSearch('');
    fetchUsers(0, '', sortBy, sortOrder);
  };

  // Handle switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Handle resolving reports
  const handleResolveReport = async (reportId) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${getConfig().publicRuntimeConfig.SQ_API_URL}/reports/resolve/${reportId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        // Remove the resolved report from the list
        setReports(reports.filter(report => report._id !== reportId));
        addNotification("success", getLocaleString("repRepMarkSolved"));
      } else {
        const errorText = await res.text();
        throw new Error(errorText);
      }
    } catch (error) {
      console.error("Error resolving report:", error);
      addNotification("error", getLocaleString("repCouldNotResolveRep"));
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== "admin") {
    return <Text>{getLocaleString("statYouNotPermission")}</Text>;
  }

  return (
    <Box>
      <Text as="h1" mb={4}>{getLocaleString("navAdminPanel")}</Text>
      
      {/* Tabs */}
      <Box display="flex" mb={4}>
        <TabButton 
          isActive={activeTab === 'users'} 
          onClick={() => handleTabChange('users')}
        >
          {getLocaleString("username")}
        </TabButton>
        <TabButton 
          isActive={activeTab === 'stats'} 
          onClick={() => handleTabChange('stats')}
        >
          {getLocaleString("navStats")}
        </TabButton>
        <TabButton 
          isActive={activeTab === 'reports'} 
          onClick={() => handleTabChange('reports')}
        >
          {getLocaleString("navReports")}
        </TabButton>
        {/* ADD PROTECT TORRENT FEATURE */}
        {SQ_ENABLE_PROTECTED_TORRENTS && (
          <TabButton 
            isActive={activeTab === 'protected-torrents'} 
            onClick={() => handleTabChange('protected-torrents')}
          >
            <Lock size={16} style={{ marginRight: '8px' }} />
            {getLocaleString('adminProtectedTorrents')}
          </TabButton>
        )}
        {/* End of Protect Torrent Feature */}
      </Box>
      
      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Search Form */}
          <Box mb={4} bg="sidebar" p={4} borderRadius="4px">
            <form onSubmit={handleSearch}>
              <Box display="flex" alignItems="center">
                <SearchInput 
                  type="text"
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={getLocaleString("adminSearchUsersPlaceholder")}
                  mr={2}
                />
                <Button type="submit" mr={2}>{getLocaleString("indexSearch")}</Button>
                {search && (
                  <Button onClick={clearSearch} variant="secondary">{getLocaleString("clear")}</Button>
                )}
              </Box>
            </form>
          </Box>
          
          {/* Users Table */}
          {loading ? (
            <Box py={4} textAlign="center">
              <Text>{getLocaleString("loading")}</Text>
            </Box>
          ) : (
            <Box>
              <StyledTable>
                <thead>
                  <tr>
                    <StyledTh onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                      {getLocaleString('username')}
                      {sortBy === 'username' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </StyledTh>
                    <StyledTh onClick={() => handleSort('role')} style={{ cursor: 'pointer' }}>
                      {getLocaleString('role')}
                      {sortBy === 'role' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </StyledTh>
                    <StyledTh onClick={() => handleSort('created')} style={{ cursor: 'pointer' }}>
                      {getLocaleString('registrationDate')}
                      {sortBy === 'created' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </StyledTh>
                    <StyledTh onClick={() => handleSort('lastSeen')} style={{ cursor: 'pointer' }}>
                      {getLocaleString('adminLastSeenColumn')}
                      {sortBy === 'lastSeen' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                    </StyledTh>
                    <StyledTh>{getLocaleString('actions')}</StyledTh>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map(user => (
                      <StyledTr key={user._id}>
                        <StyledTd>
                          <Link href={`/user/${user.username}`} passHref>
                            <Text as="a">{user.username}</Text>
                          </Link>
                        </StyledTd>
                        <StyledTd>{user.role}</StyledTd>
                        <StyledTd>{new Date(user.created).toLocaleString()}</StyledTd>
                        <StyledTd>
                          {user.lastSeen ? moment(user.lastSeen).tz(viewerTimezone).format("YYYY-MM-DD HH:mm z") : "-"}
                        </StyledTd>
                        <StyledTd>
                          <Button 
                            onClick={() => handleBanUser(user)} 
                            mr={2}
                            variant={user.banned ? "secondary" : "primary"}
                          >
                            {user.banned ? getLocaleString("adminUnbanUser") : getLocaleString("adminBanUser")}
                          </Button>
                          <DeleteButton onClick={() => handleDeleteUser(user)}>
                            {getLocaleString("adminDeleteUser")}
                          </DeleteButton>
                        </StyledTd>
                      </StyledTr>
                    ))
                  ) : (
                    <StyledTr>
                      <StyledTd colSpan="4" textAlign="center">{getLocaleString("adminNoUsersFound")}</StyledTd>
                    </StyledTr>
                  )}
                </tbody>
              </StyledTable>

              {/* Pagination */}
              <Box display="flex" alignItems="center" justifyContent="center" mt={4} py={3}>
                <Button disabled={loading || pagination.page === 0} onClick={() => fetchUsers(0)}>
                  {getLocaleString("adminPaginationFirst")}
                </Button>
                <Button disabled={loading || pagination.page === 0} onClick={() => fetchUsers(pagination.page - 1)}>
                  {getLocaleString("adminPaginationPrevious")}
                </Button>
                
                <Text mx={3} color="text">
                  {getLocaleString("adminPaginationInfo")
                    .replace("{page}", pagination.page + 1)
                    .replace("{pages}", pagination.pages)
                    .replace("{total}", pagination.total)}
                </Text>
                
                <Button disabled={loading || pagination.page >= pagination.pages - 1} onClick={() => fetchUsers(pagination.page + 1)}>
                  {getLocaleString("adminPaginationNext")}
                </Button>
                <Button disabled={loading || pagination.page >= pagination.pages - 1} onClick={() => fetchUsers(pagination.pages - 1)}>
                  {getLocaleString("adminPaginationLast")}
                </Button>
              </Box>
            </Box>
          )}
        </>
      )}
      
      {/* Stats Tab Content */}
      {activeTab === 'stats' && (
        <Box bg="sidebar" p={4} borderRadius="4px">
          {loading ? (
            <Text>{getLocaleString("loading")}</Text>
          ) : stats ? (
            <Box>
              <Text as="h2" mb={3}>{getLocaleString("navStats")}</Text>

              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
                {/* User Stats */}
                <Box bg="background" p={3} borderRadius="4px">
                  <Text as="h3" mb={2}>{getLocaleString("statUsers")}</Text>
                  {Object.entries(stats)
                    .filter(([key]) => 
                      ['registeredUsers', 'bannedUsers'].includes(key)
                    )
                    .map(([key, value]) => {
                      const localeKey = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <Text key={key}>
                          {value} {getLocaleString(`stat${localeKey}`)}
                        </Text>
                      );
                    })
                  }
                </Box>

                {/* Torrent Stats */}
                <Box bg="background" p={3} borderRadius="4px">
                  <Text as="h3" mb={2}>{getLocaleString("statTorrents")}</Text>
                  {Object.entries(stats)
                    .filter(([key]) => 
                      ['uploadedTorrents', 'completedDownloads'].includes(key)
                    )
                    .map(([key, value]) => {
                      const localeKey = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <Text key={key}>
                          {value} {getLocaleString(`stat${localeKey}`)}
                        </Text>
                      );
                    })
                  }
                </Box>

                {/* Activity Stats */}
                <Box bg="background" p={3} borderRadius="4px">
                  <Text as="h3" mb={2}>{getLocaleString("statActivity")}</Text>
                  {Object.entries(stats)
                    .filter(([key]) => 
                      ['seeders', 'leechers', 'peers', 'activeTorrents'].includes(key)
                    )
                    .map(([key, value]) => {
                      const localeKey = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <Text key={key}>
                          {value} {getLocaleString(`stat${localeKey}`)}
                        </Text>
                      );
                    })
                  }
                </Box>

                {/* Other Stats */}
                <Box bg="background" p={3} borderRadius="4px">
                  <Text as="h3" mb={2}>{getLocaleString("statOther")}</Text>
                  {Object.entries(stats)
                    .filter(([key]) => 
                      ['totalInvitesSent', 'invitesAccepted', 'totalRequests', 'filledRequests', 'totalComments'].includes(key)
                    )
                    .map(([key, value]) => {
                      const localeKey = key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <Text key={key}>
                          {value} {getLocaleString(`stat${localeKey}`)}
                        </Text>
                      );
                    })
                  }
                </Box>
              </Box>
            </Box>
          ) : (
            <Text>{getLocaleString("adminNoStatsAvailable")}</Text>
          )}
        </Box>
      )}
      
      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        <Box bg="sidebar" p={4} borderRadius="4px">
          {loading ? (
            <Text>{getLocaleString("loading")}</Text>
          ) : reports.length > 0 ? (
            <Box>
              <Text as="h2" mb={3}>{getLocaleString("navReports")}</Text>
              
              <StyledTable>
                <thead>
                  <tr>
                    <StyledTh>{getLocaleString("torrTorrent")}</StyledTh>
                    <StyledTh>{getLocaleString("repRepBy")}</StyledTh>
                    <StyledTh>{getLocaleString("repReason")}</StyledTh>
                    <StyledTh>{getLocaleString("accCreated")}</StyledTh>
                    <StyledTh>{getLocaleString("actions")}</StyledTh>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <StyledTr key={report._id}>
                      <StyledTd>
                        {report.torrent?.name}
                        <Box mt={2}>
                          <a 
                            href={`/torrent/${report.torrent?.infoHash}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            {getLocaleString("viewItem")}
                          </a>
                        </Box>
                      </StyledTd>
                      <StyledTd>{report.reportedBy?.username || 'Anonymous'}</StyledTd>
                      <StyledTd>{report.reason}</StyledTd>
                      <StyledTd>{new Date(report.created).toLocaleString()}</StyledTd>
                      <StyledTd>
                        <Button 
                          onClick={() => handleResolveReport(report._id)}
                          variant="primary"
                        >
                          {getLocaleString("repMarkSolved")}
                        </Button>
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </StyledTable>
            </Box>
          ) : (
            <Text>{getLocaleString("noReportsAvailable") || "No reports available"}</Text>
          )}
        </Box>
      )}
      
      {/* ADD PROTECT TORRENT FEATURE */}
      {SQ_ENABLE_PROTECTED_TORRENTS && (
        <ProtectTorrentModal
          isOpen={showProtectModal}
          onClose={() => {
            setShowProtectModal(false);
            setSelectedTorrent(null);
          }}
          onProtect={handleProtectionUpdate}
          infoHash={selectedTorrent?.infoHash || ""}
          torrentName={selectedTorrent?.name || ""}
          isProtected={Boolean(selectedTorrent?.isProtected)}
          currentPassword=""
        />
      )}
      {/* End of Protect Torrent Feature */}

      {activeTab === 'protected-torrents' && SQ_ENABLE_PROTECTED_TORRENTS && (
        <Box bg="sidebar" p={4} borderRadius="4px">
          {loading ? (
            <Text>{getLocaleString("loading")}</Text>
          ) : (protectedTorrents.length > 0 || unprotectedTorrents.length > 0) ? (
            <>
              <Text as="h2" mb={3}>{getLocaleString("adminProtectedTorrents")}</Text>
              <StyledTable>
                <thead>
                  <tr>
                    <StyledTh>{getLocaleString("uploadName")}</StyledTh>
                    <StyledTh>{getLocaleString("torrUploaded")}</StyledTh>
                    <StyledTh>{getLocaleString("torrUploadedBy")}</StyledTh>
                    <StyledTh>{getLocaleString("actions")}</StyledTh>
                  </tr>
                </thead>
                <tbody>
                  {protectedTorrents.map(torrent => (
                    <StyledTr key={torrent._id || torrent.infoHash}>
                      <StyledTd>
                        <Link href={`/torrent/${torrent.infoHash}`} passHref>
                          <Text as="a" fontWeight="bold">{torrent.name || torrent.infoHash}</Text>
                        </Link>
                        <Text fontFamily="mono" fontSize="xs" color="grey" mt={1}>{torrent.infoHash}</Text>
                      </StyledTd>
                      <StyledTd>
                        {torrent.created ? new Date(torrent.created).toLocaleString() : "-"}
                      </StyledTd>
                      <StyledTd>
                        {torrent.uploadedBy?.username || getLocaleString("comDelUser")}
                      </StyledTd>
                      <StyledTd>
                        <Button size="small" onClick={() => { setSelectedTorrent(torrent); setShowProtectModal(true); }}>{getLocaleString("protectTorrentUpdate")}</Button>
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </StyledTable>
              <Text as="h2" mb={3} mt={5}>{getLocaleString("adminUnprotectedTorrents")}</Text>
              <StyledTable>
                <thead>
                  <tr>
                    <StyledTh>{getLocaleString("uploadName")}</StyledTh>
                    <StyledTh>{getLocaleString("torrUploaded")}</StyledTh>
                    <StyledTh>{getLocaleString("torrUploadedBy")}</StyledTh>
                    <StyledTh>{getLocaleString("actions")}</StyledTh>
                  </tr>
                </thead>
                <tbody>
                  {unprotectedTorrents.map(torrent => (
                    <StyledTr key={torrent._id || torrent.infoHash}>
                      <StyledTd>
                        <Link href={`/torrent/${torrent.infoHash}`} passHref>
                          <Text as="a" fontWeight="bold">{torrent.name || torrent.infoHash}</Text>
                        </Link>
                        <Text fontFamily="mono" fontSize="xs" color="grey" mt={1}>{torrent.infoHash}</Text>
                      </StyledTd>
                      <StyledTd>
                        {torrent.created ? new Date(torrent.created).toLocaleString() : "-"}
                      </StyledTd>
                      <StyledTd>
                        {torrent.uploadedBy?.username || getLocaleString("comDelUser")}
                      </StyledTd>
                      <StyledTd>
                        <Button size="small" onClick={() => { setSelectedTorrent(torrent); setShowProtectModal(true); }}>{getLocaleString("protectTorrentUpdate")}</Button>
                      </StyledTd>
                    </StyledTr>
                  ))}
                </tbody>
              </StyledTable>
            </>
          ) : (
            <Text>{getLocaleString("adminNoTorrentsFound")}</Text>
          )}
        </Box>
      )}
    </Box>
  );
};

export const getServerSideProps = withAuthServerSideProps(
  async ({ token, fetchHeaders }) => {
    const { role } = jwt.verify(token, getConfig().serverRuntimeConfig.SQ_JWT_SECRET);
    return { props: { token, userRole: role } };
  }
);

export default AdminPanel; 