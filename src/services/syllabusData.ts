export interface Topic {
  name: string;
  subtopics: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  weightage: number; // Avg weightage in marks
  color: string;      // Accent theme class
  topics: Topic[];
}

export const syllabus: Subject[] = [
  {
    id: "dm",
    name: "Discrete Mathematics",
    code: "CS-DM",
    weightage: 8,
    color: "from-purple-500 to-indigo-500",
    topics: [
      {
        name: "Propositional Logic",
        subtopics: ["Syntax", "Semantics", "Truth Tables", "Tautologies", "Contradictions", "Logical Equivalence"]
      },
      {
        name: "First Order Logic",
        subtopics: ["Quantifiers", "Predicates", "Inference Rules", "Validity", "Satisfiability"]
      },
      {
        name: "Sets",
        subtopics: ["Venn Diagrams", "Set Operations", "Power Sets", "Cardinality", "Countable and Uncountable Sets"]
      },
      {
        name: "Relations",
        subtopics: ["Reflexive", "Symmetric", "Transitive", "Equivalence Relations", "Equivalence Classes"]
      },
      {
        name: "Functions",
        subtopics: ["One-to-One", "Onto", "Bijective", "Composition", "Inverse Functions"]
      },
      {
        name: "Partial Orders",
        subtopics: ["Hasse Diagrams", "Chains", "Antichains", "Upper and Lower Bounds"]
      },
      {
        name: "Lattices",
        subtopics: ["Bounded Lattices", "Distributive Lattices", "Complemented Lattices", "Boolean Algebra Connection"]
      },
      {
        name: "Monoids",
        subtopics: ["Binary Operations", "Associativity", "Identity Element"]
      },
      {
        name: "Groups",
        subtopics: ["Subgroups", "Cosets", "Lagrange Theorem", "Homomorphism", "Isomorphism"]
      },
      {
        name: "Graph Connectivity",
        subtopics: ["Paths", "Cycles", "Connected Components", "Euler Paths/Cycles", "Hamiltonian Paths/Cycles"]
      },
      {
        name: "Matching",
        subtopics: ["Bipartite Graphs", "Hall's Marriage Theorem", "Perfect Matchings"]
      },
      {
        name: "Graph Coloring",
        subtopics: ["Chromatic Number", "Brooks' Theorem", "Planar Graphs Coloring"]
      },
      {
        name: "Counting",
        subtopics: ["Permutations", "Combinations", "Pigeonhole Principle", "Inclusion-Exclusion Principle"]
      },
      {
        name: "Recurrence Relations",
        subtopics: ["Linear Recurrence", "Characteristic Equations", "Homogeneous and Non-Homogeneous"]
      },
      {
        name: "Generating Functions",
        subtopics: ["Ordinary Generating Functions", "Exponential Generating Functions", "Solving Recurrences"]
      }
    ]
  },
  {
    id: "em",
    name: "Engineering Mathematics",
    code: "CS-EM",
    weightage: 5,
    color: "from-blue-500 to-indigo-600",
    topics: [
      {
        name: "Matrices",
        subtopics: ["Matrix Types", "Addition", "Multiplication", "Transpose", "Symmetric & Skew-symmetric"]
      },
      {
        name: "Determinants",
        subtopics: ["Properties of Determinants", "Cofactors", "Adjoint", "Inverse Matrix"]
      },
      {
        name: "System of Linear Equations",
        subtopics: ["Consistency", "Gaussian Elimination", "Cramer's Rule", "Rank of Matrix"]
      },
      {
        name: "Eigenvalues",
        subtopics: ["Characteristic Equation", "Properties of Eigenvalues", "Cayley-Hamilton Theorem"]
      },
      {
        name: "Eigenvectors",
        subtopics: ["Finding Eigenvectors", "Diagonalization", "Linear Independence"]
      },
      {
        name: "LU Decomposition",
        subtopics: ["Doolittle Algorithm", "Crout Algorithm", "Solving Ax = b using LU"]
      },
      {
        name: "Limits",
        subtopics: ["One-sided Limits", "L'Hopital's Rule", "Squeeze Theorem", "Indeterminate Forms"]
      },
      {
        name: "Continuity",
        subtopics: ["Points of Discontinuity", "Intermediate Value Theorem", "Uniform Continuity"]
      },
      {
        name: "Differentiability",
        subtopics: ["Derivatives", "Chain Rule", "Implicit Differentiation"]
      },
      {
        name: "Maxima and Minima",
        subtopics: ["Local Maxima/Minima", "Critical Points", "Second Derivative Test", "Inflection Points"]
      },
      {
        name: "Mean Value Theorem",
        subtopics: ["Rolle's Theorem", "Lagrange's MVT", "Cauchy's MVT"]
      },
      {
        name: "Integration",
        subtopics: ["Definite Integrals", "Indefinite Integrals", "Fundamental Theorem of Calculus"]
      },
      {
        name: "Random Variables",
        subtopics: ["Discrete RVs", "Continuous RVs", "Probability Mass Function", "Probability Density Function"]
      },
      {
        name: "Uniform Distribution",
        subtopics: ["Mean and Variance", "Probability Calculation"]
      },
      {
        name: "Normal Distribution",
        subtopics: ["Z-scores", "Empirical Rule", "Standard Normal Distribution Table"]
      },
      {
        name: "Exponential Distribution",
        subtopics: ["Memoryless Property", "Decay Rate", "CDF and PDF"]
      },
      {
        name: "Poisson Distribution",
        subtopics: ["Mean equals Variance", "Modeling Rare Events"]
      },
      {
        name: "Binomial Distribution",
        subtopics: ["n trials", "Success probability p", "Mean and Variance of Binomial"]
      },
      {
        name: "Mean",
        subtopics: ["Arithmetic Mean", "Weighted Mean", "Expected Value"]
      },
      {
        name: "Median",
        subtopics: ["Ungrouped data median", "Properties of median"]
      },
      {
        name: "Mode",
        subtopics: ["Finding Mode", "Unimodal and Multimodal Distributions"]
      },
      {
        name: "Standard Deviation",
        subtopics: ["Variance", "Standard Deviation formula", "Coefficient of Variation"]
      },
      {
        name: "Conditional Probability",
        subtopics: ["Joint Probability", "Multiplication Rule", "Independence of Events"]
      },
      {
        name: "Bayes Theorem",
        subtopics: ["Prior and Posterior Probabilities", "Total Probability Theorem"]
      }
    ]
  },
  {
    id: "dl",
    name: "Digital Logic",
    code: "CS-DL",
    weightage: 5,
    color: "from-cyan-500 to-blue-500",
    topics: [
      {
        name: "Boolean Algebra",
        subtopics: ["Boolean Laws", "De Morgan's Theorems", "SOP and POS Forms", "Canonical Forms"]
      },
      {
        name: "Combinational Circuits",
        subtopics: ["Adders", "Subtractors", "Multiplexers", "Demultiplexers", "Encoders", "Decoders"]
      },
      {
        name: "Sequential Circuits",
        subtopics: ["Latches", "Flip-Flops (SR, JK, D, T)", "Counters (Asynchronous, Synchronous)", "Shift Registers"]
      },
      {
        name: "Minimization",
        subtopics: ["Karnaugh Maps (K-Maps)", "Quine-McCluskey Method", "Implicants & Essential Prime Implicants"]
      },
      {
        name: "Number Systems",
        subtopics: ["Binary, Octal, Hexadecimal", "Base Conversions", "Signed Magnitude", "1's and 2's Complement"]
      },
      {
        name: "Fixed Point Arithmetic",
        subtopics: ["Addition & Subtraction", "Overflow Detection", "Multiplication Algorithms"]
      },
      {
        name: "Floating Point Arithmetic",
        subtopics: ["IEEE 754 Standard", "Single & Double Precision", "Normalized & Denormalized numbers"]
      }
    ]
  },
  {
    id: "coa",
    name: "Computer Organization & Architecture",
    code: "CS-CO",
    weightage: 8,
    color: "from-teal-500 to-emerald-600",
    topics: [
      {
        name: "Machine Instructions",
        subtopics: ["Instruction Format", "Opcode & Operands", "Data Transfer, Arithmetic & Control Instructions"]
      },
      {
        name: "Addressing Modes",
        subtopics: ["Direct", "Indirect", "Immediate", "Register", "Indexed", "Relative addressing"]
      },
      {
        name: "ALU",
        subtopics: ["ALU Design", "Flag Registers", "Arithmetic Operations"]
      },
      {
        name: "Datapath",
        subtopics: ["Single-Cycle Datapath", "Multi-Cycle Datapath", "Bus Organization"]
      },
      {
        name: "Control Unit",
        subtopics: ["Hardwired Control", "Microprogrammed Control", "Microinstructions"]
      },
      {
        name: "Instruction Pipelining",
        subtopics: ["Pipeline Stages", "Throughput and Speedup", "Pipeline Performance"]
      },
      {
        name: "Pipeline Hazards",
        subtopics: ["Structural Hazards", "Data Hazards (RAW, WAR, WAW)", "Control Hazards", "Forwarding & Branch Prediction"]
      },
      {
        name: "Cache Memory",
        subtopics: ["Direct Mapping", "Associative Mapping", "Set-Associative Mapping", "Replacement Policies (LRU, FIFO)", "Cache Misses"]
      },
      {
        name: "Main Memory",
        subtopics: ["RAM & ROM chips", "Memory Interleaving", "Address Decoding"]
      },
      {
        name: "Secondary Storage",
        subtopics: ["Magnetic Disk Structure", "Disk Access Time", "RAID levels"]
      },
      {
        name: "Interrupts",
        subtopics: ["Vectored vs Non-Vectored", "Interrupt Service Routine", "Priority Interrupts"]
      },
      {
        name: "DMA",
        subtopics: ["DMA Controller", "Cycle Stealing", "Burst Mode Data Transfer"]
      }
    ]
  },
  {
    id: "pds",
    name: "Programming & Data Structures",
    code: "CS-PD",
    weightage: 10,
    color: "from-emerald-500 to-teal-500",
    topics: [
      {
        name: "Programming in C",
        subtopics: ["Variables", "Operators", "Control Statements", "Scope of Variables", "Storage Classes"]
      },
      {
        name: "Basics",
        subtopics: ["Data Types", "Type Casting", "Input/Output in C"]
      },
      {
        name: "Functions",
        subtopics: ["Call by Value", "Call by Reference", "Recursion in Functions", "Function Pointers"]
      },
      {
        name: "Pointers",
        subtopics: ["Pointer Arithmetic", "Double Pointers", "Void Pointers", "Pointers and Arrays"]
      },
      {
        name: "Arrays",
        subtopics: ["1D Arrays", "2D Arrays", "Matrix Representation", "Row-Major & Column-Major Ordering"]
      },
      {
        name: "Structures",
        subtopics: ["Structure Padding", "Unions", "Self-Referential Structures"]
      },
      {
        name: "Dynamic Memory Allocation",
        subtopics: ["malloc", "calloc", "realloc", "free", "Memory Leaks & Dangling Pointers"]
      },
      {
        name: "Data Structures",
        subtopics: ["Abstract Data Types", "Static vs Dynamic DS", "Memory Overhead"]
      },
      {
        name: "Recursion",
        subtopics: ["Tree Recursion", "Tail Recursion", "Tower of Hanoi", "Recursion trees"]
      },
      {
        name: "Stacks",
        subtopics: ["Array & List Implementation", "Infix to Postfix/Prefix conversion", "Postfix Evaluation", "Parenthesis Matching"]
      },
      {
        name: "Queues",
        subtopics: ["Circular Queue", "Double Ended Queue (Deque)", "Priority Queue", "Implementation using Stacks"]
      },
      {
        name: "Linked Lists",
        subtopics: ["Singly Linked List", "Doubly Linked List", "Circular Linked List", "Reverse list", "Detecting Loops"]
      },
      {
        name: "Trees",
        subtopics: ["Binary Tree Properties", "Tree Traversals (Inorder, Preorder, Postorder, Levelorder)", "Threaded Binary Trees"]
      },
      {
        name: "Binary Search Trees",
        subtopics: ["Search", "Insertion", "Deletion", "Inorder Successor/Predecessor", "AVL Trees (Rotations)"]
      },
      {
        name: "Binary Heaps",
        subtopics: ["Max Heap", "Min Heap", "Heapify Operation", "Insert & Extract Min/Max", "Heap Sort"]
      },
      {
        name: "Graphs",
        subtopics: ["Adjacency Matrix", "Adjacency List", "Breadth First Search (BFS)", "Depth First Search (DFS)"]
      }
    ]
  },
  {
    id: "algo",
    name: "Algorithms",
    code: "CS-AL",
    weightage: 8,
    color: "from-yellow-500 to-amber-500",
    topics: [
      {
        name: "Searching",
        subtopics: ["Linear Search", "Binary Search", "Exponential Search", "Binary Search Analysis"]
      },
      {
        name: "Sorting",
        subtopics: ["Bubble Sort", "Insertion Sort", "Selection Sort", "Merge Sort", "Quick Sort", "Radix/Count Sort"]
      },
      {
        name: "Hashing",
        subtopics: ["Hash Functions", "Collision Resolution (Chaining, Open Addressing)", "Universal Hashing"]
      },
      {
        name: "Time Complexity",
        subtopics: ["Asymptotic Notations (O, o, Omega, Theta)", "Master Theorem", "Amortized Analysis"]
      },
      {
        name: "Space Complexity",
        subtopics: ["Auxiliary Space", "Recurrence equations space complexity"]
      },
      {
        name: "Greedy",
        subtopics: ["Fractional Knapsack", "Huffman Coding", "Activity Selection problem"]
      },
      {
        name: "Dynamic Programming",
        subtopics: ["0/1 Knapsack", "Matrix Chain Multiplication", "Longest Common Subsequence", "Floyd-Warshall Algorithm"]
      },
      {
        name: "Divide and Conquer",
        subtopics: ["Recurrences", "Strassen's Matrix Multiplication", "Binary Search D&C"]
      },
      {
        name: "Graph Traversal",
        subtopics: ["BFS & DFS properties", "Topological Sort", "Strongly Connected Components (Kosaraju's)"]
      },
      {
        name: "Minimum Spanning Trees",
        subtopics: ["Kruskal's Algorithm", "Prim's Algorithm", "Cut property of MST"]
      },
      {
        name: "Shortest Paths",
        subtopics: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "All-Pairs Shortest Path"]
      }
    ]
  },
  {
    id: "toc",
    name: "Theory of Computation",
    code: "CS-TC",
    weightage: 9,
    color: "from-orange-500 to-red-500",
    topics: [
      {
        name: "Regular Expressions",
        subtopics: ["Operators", "Equivalence to Finite Automata", "Identities of Regular Expressions"]
      },
      {
        name: "Finite Automata",
        subtopics: ["DFA", "NFA", "epsilon-NFA", "NFA to DFA conversion", "Minimization of DFA", "Myhill-Nerode Theorem"]
      },
      {
        name: "Context-Free Grammars",
        subtopics: ["Derivations", "Ambiguity in Grammars", "Simplification of CFG", "Chomsky Normal Form (CNF)"]
      },
      {
        name: "Pushdown Automata",
        subtopics: ["DPDA vs NPDA", "Equivalence of PDA and CFG", "Deterministic Context Free Languages"]
      },
      {
        name: "Regular Languages",
        subtopics: ["Closure Properties", "Decision Properties", "Regular Grammar (Right/Left Linear)"]
      },
      {
        name: "Context-Free Languages",
        subtopics: ["Closure Properties of CFLs", "Decision Properties of CFLs", "Parser-Grammar relationship"]
      },
      {
        name: "Pumping Lemma",
        subtopics: ["Pumping Lemma for Regular Languages", "Pumping Lemma for CFLs", "Proving languages non-regular"]
      },
      {
        name: "Turing Machines",
        subtopics: ["Standard TM", "Multitape TM", "Non-Deterministic TM", "Recursively Enumerable Languages"]
      },
      {
        name: "Undecidability",
        subtopics: ["Halting Problem", "Post Correspondence Problem (PCP)", "Rice's Theorem", "Decidable vs Undecidable languages"]
      }
    ]
  },
  {
    id: "cd",
    name: "Compiler Design",
    code: "CS-CD",
    weightage: 4,
    color: "from-red-500 to-pink-500",
    topics: [
      {
        name: "Lexical Analysis",
        subtopics: ["Tokens, Patterns, Lexemes", "Input Buffering", "Transition Diagrams", "Lex tool"]
      },
      {
        name: "Parsing",
        subtopics: ["Top-Down Parsing (LL(1))", "Bottom-Up Parsing (LR(0), SLR(1), LALR(1), CLR(1))", "Operator Precedence Parsing", "Conflict Resolution"]
      },
      {
        name: "Syntax Directed Translation",
        subtopics: ["Syntax-Directed Definitions", "S-attributed vs L-attributed definitions", "Dependency Graphs", "Syntax Trees"]
      },
      {
        name: "Runtime Environment",
        subtopics: ["Activation Records", "Storage Allocation Strategies", "Parameter Passing Techniques"]
      },
      {
        name: "Intermediate Code Generation",
        subtopics: ["Three-Address Code (Triples, Quadruples)", "Syntax Trees", "Boolean Expressions translation", "Backpatching"]
      },
      {
        name: "Local Optimization",
        subtopics: ["Basic Blocks & Flow Graphs", "DAG representation of Basic Blocks", "Peephole Optimization"]
      },
      {
        name: "Constant Propagation",
        subtopics: ["Static Analysis", "Folding and Propagation rules"]
      },
      {
        name: "Liveness Analysis",
        subtopics: ["Data Flow Equations", "Use and Def sets", "In and Out sets computation"]
      },
      {
        name: "Common Subexpression Elimination",
        subtopics: ["Value Numbering", "Global common subexpressions"]
      }
    ]
  },
  {
    id: "os",
    name: "Operating Systems",
    code: "CS-OS",
    weightage: 8,
    color: "from-pink-500 to-rose-500",
    topics: [
      {
        name: "System Calls",
        subtopics: ["Process Control (fork, exec)", "File Management", "Device Management", "System Call API"]
      },
      {
        name: "Processes",
        subtopics: ["Process State Diagram", "Process Control Block (PCB)", "Context Switching"]
      },
      {
        name: "Threads",
        subtopics: ["User-level Threads", "Kernel-level Threads", "Multithreading Models"]
      },
      {
        name: "IPC",
        subtopics: ["Shared Memory", "Message Passing", "Pipes", "Sockets"]
      },
      {
        name: "Synchronization",
        subtopics: ["Critical Section Problem", "Peterson's Solution", "TestAndSet/Swap instructions"]
      },
      {
        name: "Concurrency",
        subtopics: ["Semaphores (Binary, Counting)", "Classical Problems (Producer-Consumer, Readers-Writers, Dining Philosophers)", "Monitors"]
      },
      {
        name: "Deadlock",
        subtopics: ["Necessary Conditions", "Resource Allocation Graph", "Deadlock Prevention & Avoidance (Banker's Algorithm)", "Deadlock Detection & Recovery"]
      },
      {
        name: "CPU Scheduling",
        subtopics: ["FCFS, SJF, SRTF, Round Robin, Priority Scheduling", "Gantt Charts", "Turnaround & Waiting time calculations"]
      },
      {
        name: "I/O Scheduling",
        subtopics: ["Disk Scheduling (FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK)", "I/O Buffering", "Interrupt-driven I/O"]
      },
      {
        name: "Memory Management",
        subtopics: ["Contiguous Allocation (First/Best/Worst Fit)", "Paging (Page Table structure)", "Segmentation", "Translation Lookaside Buffer (TLB)"]
      },
      {
        name: "Virtual Memory",
        subtopics: ["Demand Paging", "Page Replacement Algorithms (FIFO, Optimal, LRU, LFU)", "Thrashing & Working Set Model"]
      },
      {
        name: "File Systems",
        subtopics: ["Directory Structure", "File Allocation Methods (Contiguous, Linked, Indexed)", "Free Space Management"]
      }
    ]
  },
  {
    id: "db",
    name: "Databases",
    code: "CS-DB",
    weightage: 7,
    color: "from-rose-500 to-red-600",
    topics: [
      {
        name: "ER Model",
        subtopics: ["Entities, Attributes, Relationships", "Key Constraints & Participation Constraints", "ER to Relational Table conversion"]
      },
      {
        name: "Relational Algebra",
        subtopics: ["Basic Operations (Select, Project, Union, Set Difference, Cartesian Product, Rename)", "Joins (Theta, Natural, Outer Joins)"]
      },
      {
        name: "Tuple Calculus",
        subtopics: ["Domain Relational Calculus", "Tuple Relational Calculus", "Safe Expressions"]
      },
      {
        name: "SQL",
        subtopics: ["DDL, DML, DCL", "Nested Queries", "Aggregate Functions & Group By", "Triggers & Views"]
      },
      {
        name: "Integrity Constraints",
        subtopics: ["Domain Constraints", "Referential Integrity (Foreign Keys)", "Assertions"]
      },
      {
        name: "Normal Forms",
        subtopics: ["Functional Dependencies", "1NF, 2NF, 3NF, BCNF", "Lossless Join decomposition", "Dependency Preserving decomposition"]
      },
      {
        name: "File Organization",
        subtopics: ["Sequential Files", "Heap Files", "Hash Files"]
      },
      {
        name: "Indexing",
        subtopics: ["Primary, Secondary & Clustering Index", "Dense vs Sparse Index", "Multilevel Indexing"]
      },
      {
        name: "B Trees",
        subtopics: ["B-Tree structure", "Search, Insert & Delete Operations", "Min/Max keys calculation"]
      },
      {
        name: "B+ Trees",
        subtopics: ["B+ Tree properties", "Leaves linking", "Comparison with B-Tree"]
      },
      {
        name: "Transactions",
        subtopics: ["ACID Properties", "Transaction State Diagram", "Schedule (Serializable, Conflict, View Serializable)"]
      },
      {
        name: "Concurrency Control",
        subtopics: ["Two-Phase Locking (2PL)", "Strict and Rigorous 2PL", "Timestamp-Ordering Protocol", "Thomas' Write Rule"]
      }
    ]
  },
  {
    id: "cn",
    name: "Computer Networks",
    code: "CS-CN",
    weightage: 9,
    color: "from-purple-600 to-pink-500",
    topics: [
      {
        name: "Fundamentals",
        subtopics: ["Network Topologies", "Transmission Modes", "Delay types (Transmission, Propagation, Queueing)"]
      },
      {
        name: "OSI Model",
        subtopics: ["7 Layers", "Encapsulation & Decapsulation", "Layer functions"]
      },
      {
        name: "TCP/IP Model",
        subtopics: ["Comparison with OSI", "4 Layers", "Protocol suite mappings"]
      },
      {
        name: "Packet Switching",
        subtopics: ["Store-and-Forward transmission", "Datagram Networks", "Throughput analysis"]
      },
      {
        name: "Circuit Switching",
        subtopics: ["FDM and TDM", "Connection setup phase", "Resource reservation"]
      },
      {
        name: "Virtual Circuit Switching",
        subtopics: ["VC identifier", "Setup and teardown", "Comparison with Datagram"]
      },
      {
        name: "Data Link Layer",
        subtopics: ["Framing", "Error Control", "Flow Control", "Line Efficiency"]
      },
      {
        name: "Framing",
        subtopics: ["Character Count", "Character Stuffing", "Bit Stuffing"]
      },
      {
        name: "Error Detection",
        subtopics: ["Parity check", "Checksum", "Cyclic Redundancy Check (CRC)", "Hamming Distance"]
      },
      {
        name: "MAC Protocols",
        subtopics: ["Aloha (Pure, Slotted)", "CSMA, CSMA/CD, CSMA/CA", "Token Ring"]
      },
      {
        name: "Ethernet",
        subtopics: ["802.3 Frame Format", "Minimum Frame Size calculation", "Binary Exponential Backoff"]
      },
      {
        name: "Bridging",
        subtopics: ["Transparent Bridges", "Spanning Tree Protocol (STP)", "Source Routing Bridges"]
      },
      {
        name: "Network Layer",
        subtopics: ["Routing Algorithms", "IP Addressing", "Subnetting & Supernetting"]
      },
      {
        name: "Routing",
        subtopics: ["Intradomain vs Interdomain routing", "Static vs Dynamic Routing"]
      },
      {
        name: "Shortest Path Routing",
        subtopics: ["Dijkstra algorithm in networks", "Metric calculations"]
      },
      {
        name: "Flooding",
        subtopics: ["Damping loops", "Selective flooding"]
      },
      {
        name: "Distance Vector Routing",
        subtopics: ["Bellman-Ford algorithm", "Count-to-Infinity Problem", "Split Horizon & Poison Reverse"]
      },
      {
        name: "Link State Routing",
        subtopics: ["Link State Packets", "OSPF Protocol overview"]
      },
      {
        name: "Fragmentation",
        subtopics: ["MTU limitations", "Identification, DF, MF flags", "Fragment Offset calculations"]
      },
      {
        name: "IPv4",
        subtopics: ["IPv4 Header Format", "Checksum verification", "TTL field functions"]
      },
      {
        name: "CIDR",
        subtopics: ["Subnet Masks", "Classless routing table lookups", "Address Aggregation"]
      },
      {
        name: "ARP",
        subtopics: ["IP to MAC address resolution", "ARP Cache", "Proxy ARP"]
      },
      {
        name: "DHCP",
        subtopics: ["IP Address Allocation", "Lease Time", "DORA process"]
      },
      {
        name: "ICMP",
        subtopics: ["Error reporting messages", "Ping & Traceroute internals"]
      },
      {
        name: "NAT",
        subtopics: ["Private IP blocks", "Port Translation (NAPT)", "NAT Translation Table"]
      },
      {
        name: "Transport Layer",
        subtopics: ["Port Numbers", "Multiplexing/Demultiplexing", "TCP vs UDP"]
      },
      {
        name: "Flow Control",
        subtopics: ["Stop and Wait Protocol", "Go-Back-N (GBN)", "Selective Repeat (SR)", "Window Size calculations"]
      },
      {
        name: "Congestion Control",
        subtopics: ["Leaky Bucket", "Token Bucket", "TCP Congestion Window", "Slow Start, Congestion Avoidance, Fast Retransmit, Fast Recovery"]
      },
      {
        name: "UDP",
        subtopics: ["UDP Header Format", "UDP Checksum", "Connectionless transfer applications"]
      },
      {
        name: "TCP",
        subtopics: ["TCP Header Format", "3-Way Handshake", "TCP State Transition Diagram", "RTT estimation & Timeout"]
      },
      {
        name: "Sockets",
        subtopics: ["Socket address representation", "Socket programming API calls (bind, listen, accept)"]
      },
      {
        name: "Application Layer",
        subtopics: ["DNS, SMTP, HTTP, FTP, Email protocols"]
      },
      {
        name: "DNS",
        subtopics: ["Recursive & Iterative Queries", "DNS Record types (A, MX, CNAME, NS)", "DNS Cache"]
      },
      {
        name: "SMTP",
        subtopics: ["MIME encoding", "SMTP Commands (HELO, MAIL, RCPT)", "POP3 vs IMAP"]
      },
      {
        name: "HTTP",
        subtopics: ["Non-Persistent vs Persistent connections", "HTTP Methods (GET, POST)", "Cookies and Caching"]
      },
      {
        name: "FTP",
        subtopics: ["Control Connection vs Data Connection", "Active vs Passive modes"]
      },
      {
        name: "Email",
        subtopics: ["User Agents", "Mail Servers", "SMTP transmission flow"]
      }
    ]
  }
];
