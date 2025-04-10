import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { generateSummaryPrompt } from '../utils/summaryPrompt';
import { MOM_TEST_SYSTEM_PROMPT } from '../utils/momTestPrompt';

export default function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  // Fetch initial interview data
  useEffect(() => {
    async function fetchInterview() {
      try {
        setLoading(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Please log in to view this interview');
        }
        
        const { data: interviewData, error: fetchError } = await supabase
          .from('interviews')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;
        if (!interviewData) throw new Error('Interview not found');
        if (interviewData.user_id !== user.id) {
          throw new Error('You do not have permission to view this interview');
        }
        
        setInterview(interviewData);
        // Fetch initial messages after getting interview data
        await fetchMessages(interviewData.id);
        
      } catch (error) {
        console.error('Error fetching interview:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchInterview();
  }, [id]);
  
  // Fetch messages function (reusable)
  const fetchMessages = async (interviewId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Don't set main error state here, maybe a specific message error?
    }
  };

  // Generate initial bot question if messages are empty
  useEffect(() => {
    const fetchInitialQuestion = async () => {
      if (interview && messages.length === 0 && !sendingMessage && !loading) { // Ensure not already sending/loading
        console.log('Interview loaded and no messages found, generating initial question...');
        setSendingMessage(true); // Indicate activity
        try {
          const firstPrompt = [
            {
              role: 'system',
              content: MOM_TEST_SYSTEM_PROMPT
                .replace('{{persona}}', interview.persona)
                .replace('{{domain}}', interview.domain),
            },
            {
              role: 'user',
              content: `Start the interview. Ask the first question.`,
            },
          ];

          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4',
              messages: firstPrompt,
              temperature: 0.7,
            }),
          });

          if (!res.ok) {
            throw new Error(`Initial OpenAI API call failed: ${res.status}`);
          }

          const json = await res.json();
          const opening = json.choices[0].message.content.trim();

          const { data: insertedMessage, error: insertError } = await supabase
            .from('messages')
            .insert({
              interview_id: id,
              sender: 'bot',
              message: opening,
            })
            .select()
            .single();
          
          if (insertError) throw insertError;

          setMessages([insertedMessage]); // Set the single, newly created message
        } catch (error) {
          console.error('Error generating initial question:', error);
          setError('Failed to start the interview. Please refresh.');
        } finally {
          setSendingMessage(false);
        }
      }
    };

    fetchInitialQuestion();
  }, [interview, messages.length, loading]); // Depend on interview, messages.length, and loading status

  // Send a new message (user initiated)
  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || sendingMessage || !interview) return;
    
    setSendingMessage(true);
    const currentInput = newMessage;
    setNewMessage('');

    try {
      const userMessage = {
        interview_id: id,
        sender: 'user',
        message: currentInput.trim(),
        created_at: new Date().toISOString() // Temp timestamp for optimistic UI
      };

      // Optimistically update UI
      setMessages((prev) => [...prev, userMessage]);

      // Save user message to DB (without created_at)
      const { error: userInsertError } = await supabase.from('messages').insert({ 
        interview_id: userMessage.interview_id,
        sender: userMessage.sender,
        message: userMessage.message
      });
      if (userInsertError) {
          // Revert optimistic update on error
          setMessages(prev => prev.filter(m => m.created_at !== userMessage.created_at)); 
          throw userInsertError;
      }

      // Fetch history including the just-saved user message
      const { data: history, error: historyError } = await supabase
        .from('messages')
        .select('*')
        .eq('interview_id', id)
        .order('created_at');
      if (historyError || !history) throw new Error('Failed to fetch message history after user send');

      const chatHistory = [
        {
          role: 'system',
          content: MOM_TEST_SYSTEM_PROMPT
            .replace('{{persona}}', interview.persona)
            .replace('{{domain}}', interview.domain),
        },
        ...history.map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.message,
        })),
        // Note: We use the history fetched *after* saving user message, so no need to add user message again here
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: chatHistory,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        throw new Error(`API call failed: ${res.status}`);
      }

      const json = await res.json();
      const botReply = json.choices[0].message.content.trim();
      
      const botMessagePayload = {
        interview_id: id,
        sender: 'bot',
        message: botReply,
      };

      // Save bot message to DB
      const { data: insertedBotMessage, error: botInsertError } = await supabase
        .from('messages')
        .insert(botMessagePayload)
        .select()
        .single(); 
      if (botInsertError) throw botInsertError;
      
      // Update local state by replacing optimistic user message with history + real bot message
      setMessages([...history, insertedBotMessage]);

    } catch (error) {
      console.error('Error in conversation:', error);
      alert(`Error: ${error.message}`);
      // Restore input if sending failed
      setNewMessage(currentInput);
      // Consider how to handle UI state if bot message fails after user message is saved
      // Maybe refetch messages? 
      await fetchMessages(id); // Refetch to ensure consistency on error
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle finishing the interview and generating a summary
  const handleFinishInterview = async () => {
    try {
      setSummarizing(true);
      
      // Create transcript from messages
      const transcript = messages.map(msg => 
        `${msg.sender.toUpperCase()}: ${msg.message}`
      ).join('\n\n');
      
      // Generate the prompt for the AI
      const prompt = generateSummaryPrompt(transcript);
      
      // Call OpenAI API
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a summarization engine for user research conversations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });
      
      if (!res.ok) {
        throw new Error(`API call failed: ${res.status}`);
      }
      
      const data = await res.json();
      const summaryContent = data.choices[0].message.content;
      
      // Parse the JSON response
      let summaryData;
      try {
        summaryData = JSON.parse(summaryContent);
      } catch (parseError) {
        console.error("Failed to parse summary JSON:", parseError);
        // Handle cases where the AI didn't return valid JSON
        summaryData = { raw_summary: summaryContent }; // Save raw content at least
      }
      
      // Store in the summaries table
      const { error: summaryError } = await supabase
        .from('summaries')
        .insert({
          interview_id: id,
          pain_points: summaryData.pain_points || [],
          workarounds: summaryData.workarounds || [],
          tools: summaryData.tools || [],
          emotions: summaryData.emotions || [],
          confidence_score: summaryData.confidence_score || 3,
          raw_summary: summaryData.raw_summary || ''
        });
      
      if (summaryError) throw summaryError;
      
      // Update the interview with summary status
      let updatePayload = {};
      if (interview && interview.summary && typeof interview.summary === 'object') {
          updatePayload.summary = { ...interview.summary, status: 'completed' };
      } else {
          updatePayload.summary = { status: 'completed' };
      }
      
      const { error: updateError } = await supabase
        .from('interviews')
        .update(updatePayload)
        .eq('id', id);
        
      if (updateError) {
        console.error('Failed to update interview summary status:', updateError);
      }
      
      alert('Interview summary generated successfully!');
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error generating summary:', error);
      alert(`Error generating summary: ${error.message}`);
    } finally {
      setSummarizing(false);
    }
  };
  
  // Render loading state
  if (loading && !interview) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', textAlign: 'center' }}>
        <p>Loading interview data...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fff2f0', 
          color: '#ff4d4f',
          borderRadius: '4px' 
        }}>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            marginTop: '20px',
            padding: '10px 15px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  // Render null if interview data isn't ready (should be brief)
  if (!interview) {
      return null; 
  }
  
  // Main component render
  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Interview with {interview.persona}</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '8px 15px',
            backgroundColor: '#f5f5f5',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Dashboard
        </button>
      </div>
      
      {/* Interview Details */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ marginBottom: '5px' }}>Persona</h3>
          <p style={{ fontSize: '16px' }}>{interview.persona}</p>
        </div>
        <div style={{ marginBottom: '15px' }}>
          <h3 style={{ marginBottom: '5px' }}>Domain</h3>
          <p style={{ fontSize: '16px' }}>{interview.domain}</p>
        </div>
        <div>
          <h3 style={{ marginBottom: '5px' }}>Created</h3>
          <p style={{ fontSize: '16px' }}>{new Date(interview.created_at).toLocaleString()}</p>
        </div>
      </div>
      
      {/* Messages section */}
      <div style={{ 
        marginBottom: '20px',
        backgroundColor: 'white', 
        borderRadius: '4px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        height: '400px',
        overflow: 'auto',
        padding: '20px',
        display: 'flex', // Added for alignment
        flexDirection: 'column' // Stack messages vertically
      }}>
        {messages.length === 0 && !sendingMessage ? (
          <p style={{ textAlign: 'center', color: '#999' }}>The AI assistant will start the conversation shortly.</p>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg.id || `temp-${index}`}
              style={{
                padding: '10px 15px',
                margin: '10px 0',
                borderRadius: '4px',
                maxWidth: '70%',
                wordBreak: 'break-word',
                backgroundColor: msg.sender === 'user' ? '#e6f7ff' : '#f5f5f5',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                marginLeft: msg.sender === 'user' ? 'auto' : '0',
              }}
            >
              <p style={{ margin: 0 }}>{msg.message}</p>
              <small style={{ color: '#999', display: 'block', marginTop: '5px' }}>
                {msg.sender} • {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
              </small>
            </div>
          ))
        )}
        {/* Loading indicator at the bottom */}
        {sendingMessage && (
          <div style={{ textAlign: 'center', padding: '10px', marginTop: 'auto' }}>
            <p style={{ color: '#999' }}>AI is thinking...</p>
          </div>
        )}
      </div>
      
      {/* Message input */}
      <form onSubmit={sendMessage} style={{ marginBottom: '20px', display: 'flex' }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={sendingMessage || !interview}
          style={{
            flex: 1,
            padding: '10px 15px',
            borderRadius: '4px 0 0 4px',
            border: '1px solid #d9d9d9',
            fontSize: '16px'
          }}
        />
        <button
          type="submit"
          disabled={sendingMessage || !interview}
          style={{
            padding: '10px 20px',
            backgroundColor: sendingMessage || !interview ? '#cccccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '0 4px 4px 0',
            cursor: sendingMessage || !interview ? 'not-allowed' : 'pointer'
          }}
        >
          {sendingMessage ? 'Sending...' : 'Send'}
        </button>
      </form>
      
      {/* Finish Interview button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={handleFinishInterview}
          disabled={summarizing || messages.length < 2 || sendingMessage || !interview}
          style={{
            padding: '12px 25px',
            backgroundColor: '#52c41a',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: summarizing || messages.length < 2 || sendingMessage || !interview ? 'not-allowed' : 'pointer',
            opacity: summarizing || messages.length < 2 || sendingMessage || !interview ? 0.7 : 1
          }}
        >
          {summarizing ? 'Generating Summary...' : 'Finish & Generate Summary'}
        </button>
        {messages.length < 2 && (
          <p style={{ color: '#999', marginTop: '10px' }}>
            Need at least a couple of messages to generate a summary.
          </p>
        )}
      </div>
    </div>
  );
}
  